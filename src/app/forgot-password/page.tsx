import Link from "next/link";
import { requestPasswordReset } from "@/app/auth/actions";
import { LanguageSwitcher } from "@/components/language-switcher";
import { cardClass, fieldClass, btnPrimaryClass } from "@/lib/ui";
import { getDictionary, getLocale } from "@/lib/i18n/dictionary";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const locale = await getLocale();
  const t = getDictionary(locale).auth.forgotPassword;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="animate-fade-in-up w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            <span className="text-emerald-500">.</span>fluxo
          </h1>
          <p className="mt-2 text-sm text-foreground/50">{t.heading}</p>
        </div>

        {message === "check-email" ? (
          <div className={`${cardClass} flex flex-col gap-2 p-6 text-center`}>
            <p className="text-sm font-medium">{t.checkEmailTitle}</p>
            <p className="text-sm text-foreground/50">{t.checkEmailBody}</p>
          </div>
        ) : (
          <form action={requestPasswordReset} className={`${cardClass} flex flex-col gap-4 p-6`}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground/70">
                {t.emailLabel}
              </label>
              <input id="email" name="email" type="email" required autoComplete="email" className={fieldClass} />
            </div>

            <button type="submit" className={`${btnPrimaryClass} mt-2`}>
              {t.submit}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-foreground/50">
          <Link href="/login" className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground">
            {t.backToLogin}
          </Link>
        </p>

        <div className="mt-6">
          <LanguageSwitcher current={locale} redirectTo="/forgot-password" />
        </div>
      </div>
    </main>
  );
}
