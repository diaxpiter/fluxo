export type Locale = "en-US" | "pt-BR" | "pt-PT";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export const DEFAULT_LOCALE: Locale = "en-US";

export const LOCALES: { code: Locale; nativeName: string }[] = [
  { code: "en-US", nativeName: "English (US)" },
  { code: "pt-BR", nativeName: "Português (Brasil)" },
  { code: "pt-PT", nativeName: "Português (Portugal)" },
];

export function isLocale(value: string | undefined | null): value is Locale {
  return LOCALES.some((l) => l.code === value);
}
