"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/locales";

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
  }

  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const displayName = formData.get("displayName") as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    redirect("/signup?message=check-email");
  }

  const cookieStore = await cookies();
  const language = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(language) && data.user) {
    await supabase.from("profiles").update({ language }).eq("id", data.user.id);
  }

  redirect("/dashboard");
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
