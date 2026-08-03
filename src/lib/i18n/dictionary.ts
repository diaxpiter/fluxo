import { cookies } from "next/headers";
import type { WidgetKey } from "@/lib/widgets";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/lib/i18n/locales";
import { en_US } from "@/lib/i18n/dictionaries/en-US";
import { pt_BR } from "@/lib/i18n/dictionaries/pt-BR";
import { pt_PT } from "@/lib/i18n/dictionaries/pt-PT";

export type Dictionary = {
  nav: {
    home: string;
    history: string;
    settings: string;
  };
  common: {
    save: string;
    cancel: string;
    edit: string;
    delete: string;
    uncategorized: string;
    settingUpAccount: string;
    mainAccount: string;
  };
  home: {
    /** Placeholder: {firstName} */
    greeting: string;
    overview: string;
    recentActivity: string;
    viewAll: string;
  };
  history: {
    title: string;
  };
  settings: {
    title: string;
    widgetsHeading: string;
    accountHeading: string;
    languageHeading: string;
    sessionHeading: string;
    logOut: string;
  };
  widgets: Record<WidgetKey, string>;
  widgetCustomizer: {
    helpText: string;
    wide: string;
    /** Placeholder: {title} */
    moveUp: string;
    /** Placeholder: {title} */
    moveDown: string;
  };
  startingBalance: {
    editLink: string;
  };
  transactionList: {
    empty: string;
    date: string;
    description: string;
    category: string;
    amount: string;
    balance: string;
    type: string;
    moneyIn: string;
    moneyOut: string;
    deleteTitle: string;
    /** Placeholders: {description}, {amount} */
    deleteBody: string;
  };
  addTransaction: {
    addButtonLabel: string;
    heading: string;
    closeLabel: string;
    dateLabel: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    categoryLabel: string;
    amountLabel: string;
    amountPlaceholder: string;
    moneyIn: string;
    moneyOut: string;
  };
  addCategory: {
    newCategory: string;
    namePlaceholder: string;
  };
  importTransactions: {
    linkText: string;
    heading: string;
    closeLabel: string;
    helpText: string;
    importButton: string;
    importingButton: string;
    noFileSelected: string;
    invalidFile: string;
    noTransactionsFound: string;
    /** Placeholders: {count}, {balance} */
    summary: string;
    done: string;
  };
  auth: {
    login: {
      heading: string;
      emailLabel: string;
      passwordLabel: string;
      submit: string;
      noAccount: string;
      signupLink: string;
    };
    signup: {
      heading: string;
      checkEmailTitle: string;
      checkEmailBody: string;
      nameLabel: string;
      emailLabel: string;
      passwordLabel: string;
      submit: string;
      haveAccount: string;
      loginLink: string;
    };
  };
};

const DICTIONARIES: Record<Locale, Dictionary> = {
  "en-US": en_US,
  "pt-BR": pt_BR,
  "pt-PT": pt_PT,
};

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
