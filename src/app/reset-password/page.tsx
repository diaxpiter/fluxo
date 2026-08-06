import { updatePassword } from "@/app/auth/actions";
import { cardClass, fieldClass, btnPrimaryClass } from "@/lib/ui";
import { getDictionary, getLocale } from "@/lib/i18n/dictionary";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const locale = await getLocale();
  const t = getDictionary(locale).auth.resetPassword;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="animate-fade-in-up w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            <span className="text-emerald-500">.</span>fluxo
          </h1>
          <p className="mt-2 text-sm text-foreground/50">{t.heading}</p>
        </div>

        <form action={updatePassword} className={`${cardClass} flex flex-col gap-4 p-6`}>
          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground/70">
              {t.passwordLabel}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground/70">
              {t.confirmPasswordLabel}
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
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
