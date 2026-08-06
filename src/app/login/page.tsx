import Link from "next/link";
import { login } from "@/app/auth/actions";
import { LanguageSwitcher } from "@/components/language-switcher";
import { cardClass, fieldClass, btnPrimaryClass } from "@/lib/ui";
import { getDictionary, getLocale } from "@/lib/i18n/dictionary";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const locale = await getLocale();
  const t = getDictionary(locale).auth.login;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="animate-fade-in-up w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            <span className="text-emerald-500">.</span>fluxo
          </h1>
          <p className="mt-2 text-sm text-foreground/50">{t.heading}</p>
        </div>

        <form action={login} className={`${cardClass} flex flex-col gap-4 p-6`}>
          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground/70">
              {t.emailLabel}
            </label>
            <input id="email" name="email" type="email" required autoComplete="email" className={fieldClass} />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-foreground/70">
                {t.passwordLabel}
              </label>
              <Link href="/forgot-password" className="text-xs text-foreground/50 underline decoration-foreground/20 underline-offset-4 hover:text-foreground hover:decoration-foreground">
                {t.forgotPasswordLink}
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className={fieldClass}
            />
          </div>

          <button type="submit" className={`${btnPrimaryClass} mt-2`}>
            {t.submit}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-foreground/50">
          {t.noAccount}{" "}
          <Link href="/signup" className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground">
            {t.signupLink}
          </Link>
        </p>

        <div className="mt-6">
          <LanguageSwitcher current={locale} redirectTo="/login" />
        </div>
      </div>
    </main>
  );
}
