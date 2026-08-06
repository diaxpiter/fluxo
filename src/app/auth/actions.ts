"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/locales";
import { getDictionary, getLocale } from "@/lib/i18n/dictionary";

/**
 * The Origin header on a Server Action POST is trustworthy -- Next.js itself rejects the
 * request before this code runs if it doesn't match the deployment's own host (its built-in
 * CSRF protection). Used instead of an env var so password-reset/confirmation links always
 * point at whichever host actually served the request (custom domain, preview deployment, etc).
 */
async function siteOrigin() {
  const headerList = await headers();
  return headerList.get("origin") ?? "";
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // One-time sync (not done on every request) so switching devices/browsers
  // picks up the saved language preference without adding a DB round trip
  // to every navigation via middleware.
  const { data: profile } = await supabase.from("profiles").select("language").eq("id", data.user.id).single();
  if (isLocale(profile?.language)) {
    const cookieStore = await cookies();
    if (cookieStore.get(LOCALE_COOKIE)?.value !== profile.language) {
      cookieStore.set(LOCALE_COOKIE, profile.language, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    }

    // Backfills auth user_metadata.language for accounts created before this existed --
    // Supabase's own email templates (confirmation/recovery) key off .Data.language to pick a
    // language, and can only see user_metadata, not the profiles table.
    if (data.user.user_metadata?.language !== profile.language) {
      await supabase.auth.updateUser({ data: { language: profile.language } });
    }
  }

  // A verified TOTP factor means this password alone only grants aal1 -- send them to the
  // second-factor challenge instead of straight to the dashboard. (Also enforced in middleware
  // for sessions resumed later, not just at the moment of login.)
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
    redirect("/login/mfa");
  }

  redirect("/dashboard");
}

export async function verifyMfaChallenge(formData: FormData) {
  const supabase = await createClient();
  const t = getDictionary(await getLocale()).auth.mfaChallenge;
  const code = (formData.get("code") as string)?.trim();

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp.find((f) => f.status === "verified");
  if (!factor) redirect("/dashboard");

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
  if (challengeError || !challenge) redirect(`/login/mfa?error=${encodeURIComponent(t.invalidCode)}`);

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.id,
    code,
  });
  if (verifyError) redirect(`/login/mfa?error=${encodeURIComponent(t.invalidCode)}`);

  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const displayName = formData.get("displayName") as string;

  // Read before signUp (not after) so it's already in user_metadata by the time Supabase sends
  // the confirmation email that same call triggers -- that email's template picks a language
  // off .Data.language, which only ever sees user_metadata, never the profiles table.
  const cookieStore = await cookies();
  const language = cookieStore.get(LOCALE_COOKIE)?.value;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName, ...(isLocale(language) ? { language } : {}) },
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    redirect("/signup?message=check-email");
  }

  if (isLocale(language) && data.user) {
    await supabase.from("profiles").update({ language }).eq("id", data.user.id);
  }

  redirect("/onboarding");
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/confirm?type=recovery&next=/reset-password`,
  });

  // Always the same redirect, whether or not that email has an account -- confirming which
  // emails are registered is exactly the kind of thing a finance app shouldn't leak.
  redirect("/forgot-password?message=check-email");
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const t = getDictionary(await getLocale()).auth.resetPassword;

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  if (password !== confirmPassword) {
    redirect(`/reset-password?error=${encodeURIComponent(t.mismatchError)}`);
  }

  // Only reachable with the recovery session /auth/confirm established -- if that session is
  // missing or already spent, updateUser fails rather than silently doing nothing.
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/reset-password?error=${encodeURIComponent(t.expiredError)}`);

  redirect("/dashboard");
}

export type EnrollMfaResult =
  | { ok: true; factorId: string; qrCode: string; secret: string }
  | { ok: false; error: string };

export async function enrollMfa(): Promise<EnrollMfaResult> {
  const supabase = await createClient();
  const t = getDictionary(await getLocale()).mfaSettings;

  // Clear out any unverified factor left over from a closed-without-finishing enrollment
  // attempt first -- Supabase caps how many TOTP factors a user can hold, and a stale
  // unverified one would otherwise eventually block starting over. `totp` in listFactors'
  // response is verified-only by construction; `all` is where an unverified one would show up.
  const { data: existing } = await supabase.auth.mfa.listFactors();
  const stale = existing?.all.filter((f) => f.factor_type === "totp" && f.status === "unverified") ?? [];
  await Promise.all(stale.map((f) => supabase.auth.mfa.unenroll({ factorId: f.id })));

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error || !data) return { ok: false, error: t.errorGeneric };

  return { ok: true, factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export type MfaActionResult = { ok: true } | { ok: false; error: string };

export async function verifyMfaEnrollment(formData: FormData): Promise<MfaActionResult> {
  const supabase = await createClient();
  const t = getDictionary(await getLocale()).mfaSettings;

  const factorId = formData.get("factorId") as string;
  const code = (formData.get("code") as string)?.trim();

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError || !challenge) return { ok: false, error: t.invalidCode };

  const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
  if (verifyError) return { ok: false, error: t.invalidCode };

  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function unenrollMfa(formData: FormData): Promise<MfaActionResult> {
  const supabase = await createClient();
  const t = getDictionary(await getLocale()).mfaSettings;

  const { error } = await supabase.auth.mfa.unenroll({ factorId: formData.get("factorId") as string });
  if (error) return { ok: false, error: t.errorGeneric };

  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function setLocaleCookie(formData: FormData) {
  const language = formData.get("language") as string | null;
  const redirectTo = (formData.get("redirectTo") as string | null) ?? "/login";

  if (isLocale(language)) {
    const cookieStore = await cookies();
    cookieStore.set(LOCALE_COOKIE, language, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  }

  redirect(redirectTo);
}
