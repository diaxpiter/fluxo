import { setLocaleCookie } from "@/app/auth/actions";
import { LOCALES, type Locale } from "@/lib/i18n/locales";

export function LanguageSwitcher({ current, redirectTo }: { current: Locale; redirectTo: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-xs text-foreground/50">
      {LOCALES.map((l, i) => (
        <span key={l.code} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden>·</span>}
          <form action={setLocaleCookie}>
            <input type="hidden" name="language" value={l.code} />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <button
              type="submit"
              className={
                l.code === current
                  ? "cursor-default font-medium text-foreground"
                  : "cursor-pointer underline decoration-foreground/20 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
              }
              disabled={l.code === current}
            >
              {l.nativeName}
            </button>
          </form>
        </span>
      ))}
    </div>
  );
}
