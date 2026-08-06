import type { AllocationMethod, AccountType, BillRecurrenceType, IncomeScheduleType, WeekendHolidayRule } from "@/lib/types";

/** Account types offered as onboarding set-asides — the day-to-day types (checking/cash) are handled separately. */
export type SetAsideType = Extract<AccountType, "sinking_fund" | "savings" | "emergency" | "investment" | "shared">;

export const SET_ASIDE_TYPES: SetAsideType[] = ["sinking_fund", "savings", "emergency", "investment", "shared"];

/** Keys of the seeded starter categories a preset bill can be filed under. */
export type PresetBillCategoryKey = "housing" | "utilities" | "subscriptions" | "other";

export type PresetBillKey = "rentOrMortgage" | "electricity" | "water" | "internet" | "gym" | "carLoan" | "subscriptions";

export const PRESET_BILLS: { key: PresetBillKey; categoryKey: PresetBillCategoryKey }[] = [
  { key: "rentOrMortgage", categoryKey: "housing" },
  { key: "electricity", categoryKey: "utilities" },
  { key: "water", categoryKey: "utilities" },
  { key: "internet", categoryKey: "utilities" },
  { key: "gym", categoryKey: "subscriptions" },
  { key: "carLoan", categoryKey: "other" },
  { key: "subscriptions", categoryKey: "subscriptions" },
];

export type DayToDayAccountAnswer = {
  name: string;
  startingBalance: number;
};

export type IncomeAnswer = {
  name: string;
  scheduleType: IncomeScheduleType;
  dayOfMonth: number | null;
  weekendHolidayRule: WeekendHolidayRule;
  expectedAmount: number | null;
};

export type BillAnswer = {
  name: string;
  isVariable: boolean;
  amount: number;
  estimatedAmount: number | null;
  categoryKey: PresetBillCategoryKey;
  recurrenceType: BillRecurrenceType;
  dueDayOfMonth: number;
  dueDayOfWeek: number;
  dueMonth: number;
  anchorDate: string;
};

export type SetAsideAnswer = {
  type: SetAsideType;
  name: string;
  method: Extract<AllocationMethod, "fixed_amount" | "percentage">;
  value: number;
  includeInOverview: boolean;
};

/** Everything the wizard accumulates client-side before one final submit. */
export type OnboardingAnswers = {
  /** First entry renames the seeded "Main Account"; any further entries are new accounts. */
  dayToDayAccounts: DayToDayAccountAnswer[];
  income: IncomeAnswer | null;
  bills: BillAnswer[];
  setAsides: SetAsideAnswer[];
};

export const EMPTY_ONBOARDING_ANSWERS: OnboardingAnswers = {
  dayToDayAccounts: [{ name: "", startingBalance: 0 }],
  income: null,
  bills: [],
  setAsides: [],
};

/**
 * Fixed obligations before percentage-based ones, since they're typically less
 * negotiable — a sane default priority_order, reorderable afterward in Settings.
 * Both the review step's live preview and completeOnboarding's real insert use
 * this so the preview never lies about what's about to be created.
 */
export function orderedSetAsides(setAsides: SetAsideAnswer[]): SetAsideAnswer[] {
  const fixed = setAsides.filter((s) => s.method === "fixed_amount");
  const percentage = setAsides.filter((s) => s.method === "percentage");
  return [...fixed, ...percentage];
}
