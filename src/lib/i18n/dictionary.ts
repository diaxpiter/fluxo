import { cookies } from "next/headers";
import type { WidgetKey } from "@/lib/widgets";
import type { AccountType } from "@/lib/types";
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
    account: string;
  };
  /** Labels for the literal English category names the signup trigger seeds every account with. */
  categories: {
    income: string;
    housing: string;
    utilities: string;
    subscriptions: string;
    savings: string;
    discretionary: string;
    other: string;
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
    languageHeading: string;
    sessionHeading: string;
    logOut: string;
  };
  accountTypes: Record<AccountType, string>;
  accounts: {
    heading: string;
    empty: string;
    nameLabel: string;
    typeLabel: string;
    startingBalanceLabel: string;
    includeInOverviewLabel: string;
    addButton: string;
    archiveButton: string;
    archiveTitle: string;
    /** Placeholder: {name} */
    archiveBody: string;
  };
  transfer: {
    heading: string;
    fromLabel: string;
    toLabel: string;
    amountLabel: string;
    dateLabel: string;
    descriptionLabel: string;
    submitButton: string;
    sameAccountError: string;
    /** Placeholder: {name} */
    toDescription: string;
    /** Placeholder: {name} */
    fromDescription: string;
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
  recurringBills: {
    heading: string;
    empty: string;
    nameLabel: string;
    amountLabel: string;
    estimatedAmountLabel: string;
    variableAmountLabel: string;
    dueDayLabel: string;
    activeLabel: string;
    addButton: string;
    markAsPaid: string;
    paidThisMonth: string;
    /** Placeholder: {day} */
    dueDayBadge: string;
    deleteTitle: string;
    /** Placeholder: {name} */
    deleteBody: string;
  };
  incomeSources: {
    heading: string;
    empty: string;
    nameLabel: string;
    scheduleTypeLabel: string;
    fixedMonthlyLabel: string;
    irregularLabel: string;
    dayOfMonthLabel: string;
    weekendShiftLabel: string;
    weekendShiftNone: string;
    weekendShiftEarlier: string;
    weekendShiftLater: string;
    expectedAmountLabel: string;
    addButton: string;
    markAsReceived: string;
    receivedThisMonth: string;
    /** Placeholder: {day} */
    dayBadge: string;
    irregularBadge: string;
    deleteTitle: string;
    /** Placeholder: {name} */
    deleteBody: string;
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
