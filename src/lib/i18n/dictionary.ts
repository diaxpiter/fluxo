import { cookies } from "next/headers";
import type { WidgetKey } from "@/lib/widgets";
import type { AccountType } from "@/lib/types";
import type { PresetBillKey } from "@/lib/onboarding";
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
    savedToast: string;
    deletedToast: string;
    errorToast: string;
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
    hideAmountsLabel: string;
    showAmountsLabel: string;
  };
  history: {
    title: string;
    monthColumn: string;
  };
  settings: {
    title: string;
    widgetsHeading: string;
    categoriesHeading: string;
    sharingHeading: string;
    dataExportHeading: string;
    languageHeading: string;
    securityHeading: string;
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
    totalLabel: string;
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
    /** Shown when trying to edit one leg of a transfer, or a bill/income-linked row -- delete and redo instead. */
    linkedEditError: string;
    selectButton: string;
    /** Placeholder: {count} */
    selectedCount: string;
    /** Placeholder: {count} */
    deleteSelectedTitle: string;
    /** Placeholder: {count} */
    deleteSelectedBody: string;
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
    frequencyLabel: string;
    monthlyLabel: string;
    weeklyLabel: string;
    biweeklyLabel: string;
    yearlyLabel: string;
    dayOfWeekLabel: string;
    monthLabel: string;
    startingFromLabel: string;
    /** Placeholder: {day} */
    dueWeeklyBadge: string;
    /** Placeholder: {day} */
    dueBiweeklyBadge: string;
    /** Placeholders: {month}, {day} */
    dueYearlyBadge: string;
    /** Placeholders: {paid}, {total} */
    paidCountBadge: string;
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
    estimatedAmountLabel: string;
    variableAmountLabel: string;
    addButton: string;
    markAsReceived: string;
    receivedThisMonth: string;
    /** Placeholder: {day} */
    dayBadge: string;
    irregularBadge: string;
    deleteTitle: string;
    /** Placeholder: {name} */
    deleteBody: string;
    allocationPreviewHeading: string;
    /** Placeholders: {amount}, {account} */
    allocationRemaining: string;
  };
  allocationRules: {
    heading: string;
    empty: string;
    targetAccountLabel: string;
    methodLabel: string;
    methodFixedAmount: string;
    methodPercentage: string;
    methodRemainder: string;
    valueLabel: string;
    addButton: string;
    deleteTitle: string;
    /** Placeholder: {account} */
    deleteBody: string;
  };
  addCategory: {
    newCategory: string;
    namePlaceholder: string;
  };
  categoryDetail: {
    backLabel: string;
    /** Kind labels for the literal English `kind` values the signup trigger seeds categories with. */
    kindLabels: Record<"income" | "fixed_bill" | "savings" | "discretionary" | "other", string>;
    range1m: string;
    range3m: string;
    range6m: string;
    range12m: string;
    rangeAll: string;
    totalLabel: string;
    /** Placeholder: {count} */
    transactionsCount: string;
    monthlyAverageLabel: string;
    /** Placeholder: {count} */
    monthlyAverageSub: string;
    monthlyAverageNoDataSub: string;
    monthToDateLabel: string;
    pacingAboveLabel: string;
    pacingBelowLabel: string;
    avgTransactionLabel: string;
    /** Placeholder: {amount} */
    largestTransactionSub: string;
    chartHeading: string;
    averageLegend: string;
    currentMonthSuffix: string;
    whereItGoesHeading: string;
    whereItGoesCaveat: string;
    /** Placeholder: {count} */
    timesCount: string;
    otherLabel: string;
    transactionsHeading: string;
    empty: string;
  };
  spaces: {
    switcherLabel: string;
    heading: string;
    description: string;
    closeLabel: string;
    addButton: string;
    nameLabel: string;
    namePlaceholder: string;
    colorLabel: string;
    deleteTitle: string;
    /** Placeholder: {name} */
    deleteBody: string;
    lastSpaceError: string;
    membersHeading: string;
    inviteEmailLabel: string;
    inviteEmailPlaceholder: string;
    inviteButton: string;
    inviteSelfError: string;
    inviteNotOwnerError: string;
    inviteDuplicateError: string;
    pendingBadge: string;
    ownerLabel: string;
    removeButton: string;
    leaveButton: string;
    leaveConfirmTitle: string;
    /** Placeholder: {name} */
    leaveConfirmBody: string;
    pendingInvitesHeading: string;
    /** Placeholders: {inviter}, {space} */
    pendingInviteBody: string;
    /** Placeholder: {space} */
    pendingInviteBodyUnknownInviter: string;
    acceptButton: string;
    declineButton: string;
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
    /** Placeholder: {count} */
    summaryNoBalance: string;
    /** Placeholder: {count}. Shown when a balance column is present but this isn't the account's first import. */
    summaryBalanceSkippedNotFirst: string;
    /** Placeholder: {count} */
    skippedRowsWarning: string;
    /** Placeholder: {amount} */
    expectedLabel: string;
    done: string;
  };
  onboarding: {
    /** Placeholders: {current}, {total} */
    stepIndicator: string;
    back: string;
    next: string;
    welcomeStep: {
      /** This locale's own word for "Welcome" -- also read directly off all three dictionaries at once for the pulsing multi-language greeting, before a language is chosen. */
      greetingWord: string;
      languageLabel: string;
    };
    accountsStep: {
      heading: string;
      helpText: string;
      addAccountButton: string;
      removeAccountLabel: string;
    };
    incomeStep: {
      heading: string;
      helpText: string;
      startButton: string;
      skipButton: string;
    };
    billsStep: {
      heading: string;
      helpText: string;
      presetBills: Record<PresetBillKey, string>;
      addCustomButton: string;
      customNameLabel: string;
      categoryLabel: string;
      removeBillLabel: string;
    };
    setAsidesStep: {
      heading: string;
      helpText: string;
      sinkingFundHint: string;
      nameLabel: string;
      /** Label above the combined amount+method row, e.g. "Each time income arrives, set aside" */
      amountRowLabel: string;
      /** The percentage option in that row's method select, phrased for a first-time user */
      percentOfIncomeOption: string;
      addSetAsideButton: string;
      removeSetAsideLabel: string;
    };
    reviewStep: {
      heading: string;
      helpText: string;
      overviewQuestion: string;
      singleBalanceOption: string;
      freeToSpendOption: string;
      accountsHeading: string;
      incomeHeading: string;
      billsHeading: string;
      setAsidesHeading: string;
      noIncome: string;
      noBills: string;
      noSetAsides: string;
      /** Placeholders: {amount}, {account} */
      allocationLine: string;
      /** Placeholders: {amount}, {account} */
      remainderLine: string;
      confirmButton: string;
    };
  };
  auth: {
    login: {
      heading: string;
      emailLabel: string;
      passwordLabel: string;
      submit: string;
      forgotPasswordLink: string;
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
    forgotPassword: {
      heading: string;
      emailLabel: string;
      submit: string;
      backToLogin: string;
      checkEmailTitle: string;
      checkEmailBody: string;
    };
    resetPassword: {
      heading: string;
      passwordLabel: string;
      confirmPasswordLabel: string;
      submit: string;
      mismatchError: string;
      expiredError: string;
      success: string;
    };
    mfaChallenge: {
      heading: string;
      helpText: string;
      codeLabel: string;
      submit: string;
      invalidCode: string;
    };
  };
  dataExport: {
    description: string;
    csvButton: string;
    jsonButton: string;
  };
  mfaSettings: {
    description: string;
    enabledLabel: string;
    disabledLabel: string;
    enrollButton: string;
    cancelButton: string;
    scanHelpText: string;
    codeLabel: string;
    verifyButton: string;
    disableButton: string;
    disableConfirmTitle: string;
    disableConfirmBody: string;
    invalidCode: string;
    errorGeneric: string;
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
