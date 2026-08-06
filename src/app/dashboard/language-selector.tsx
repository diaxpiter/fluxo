import { updateLanguage } from "@/app/dashboard/actions";
import { LOCALES, type Locale } from "@/lib/i18n/locales";
import { btnGhostClass, btnPrimaryClass } from "@/lib/ui";

// A Server Component can't pass a plain inline closure as a <form action> -- only a real
// server action reference. This tiny wrapper discards updateLanguage's ActionResult so the
// form's action type matches, while staying a genuine server action itself.
async function setLanguage(formData: FormData) {
  "use server";
  await updateLanguage(formData);
}

export function LanguageSelector({ current }: { current: Locale }) {
  return (
    <div className="flex flex-wrap gap-2">
      {LOCALES.map((l) => (
        <form key={l.code} action={setLanguage}>
          <input type="hidden" name="language" value={l.code} />
          <button type="submit" className={l.code === current ? btnPrimaryClass : btnGhostClass}>
            {l.nativeName}
          </button>
        </form>
      ))}
    </div>
  );
}
