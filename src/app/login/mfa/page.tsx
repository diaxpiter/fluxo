import { redirect } from "next/navigation";
import { verifyMfaChallenge } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { cardClass, fieldClass, btnPrimaryClass } from "@/lib/ui";
import { getDictionary, getLocale } from "@/lib/i18n/dictionary";

export default async function LoginMfaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const locale = await getLocale();
  const t = getDictionary(locale).auth.mfaChallenge;

  // /login/mfa is reachable without a fully-authed check further up (it's treated as public in
  // middleware, since a bare aal1 session needs to reach it) -- guard here instead: no session,
  // or no pending step-up, and there's nothing to challenge.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!aal || aal.nextLevel !== "aal2" || aal.nextLevel === aal.currentLevel) redirect("/dashboard");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="animate-fade-in-up w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            <span className="text-emerald-500">.</span>fluxo
          </h1>
          <p className="mt-2 text-sm text-foreground/50">{t.heading}</p>
          <p className="mt-1 text-sm text-foreground/40">{t.helpText}</p>
        </div>

        <form action={verifyMfaChallenge} className={`${cardClass} flex flex-col gap-4 p-6`}>
          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="code" className="text-sm font-medium text-foreground/70">
              {t.codeLabel}
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              className={fieldClass}
            />
          </div>

          <button type="submit" className={`${btnPrimaryClass} mt-2`}>
            {t.submit}
          </button>
        </form>
      </div>
    </main>
  );
}
