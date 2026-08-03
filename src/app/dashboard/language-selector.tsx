import { updateLanguage } from "@/app/dashboard/actions";
import { LOCALES, type Locale } from "@/lib/i18n/locales";
import { btnGhostClass, btnPrimaryClass } from "@/lib/ui";

export function LanguageSelector({ current }: { current: Locale }) {
  return (
    <div className="flex flex-wrap gap-2">
      {LOCALES.map((l) => (
        <form key={l.code} action={updateLanguage}>
          <input type="hidden" name="language" value={l.code} />
          <button type="submit" className={l.code === current ? btnPrimaryClass : btnGhostClass}>
            {l.nativeName}
          </button>
        </form>
      ))}
    </div>
  );
}
