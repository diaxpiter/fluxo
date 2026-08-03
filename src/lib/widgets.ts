import type { Transaction } from "@/lib/types";

export type WidgetKey =
  | "end_of_month_projection"
  | "bills_to_pay"
  | "incoming_this_week"
  | "paid_this_week"
  | "spent_this_month"
  | "biggest_expense_this_month"
  | "income_this_month"
  | "net_this_month"
  | "biggest_income_this_month"
  | "bills_next_7_days";

export type WidgetPref = {
  key: WidgetKey;
  visible: boolean;
  /** Stands alone in its own full-width row instead of pairing up with the next widget. */
  wide: boolean;
};

export const DEFAULT_WIDGETS: WidgetPref[] = [
  { key: "end_of_month_projection", visible: true, wide: true },
  { key: "bills_to_pay", visible: true, wide: false },
  { key: "incoming_this_week", visible: true, wide: false },
  { key: "paid_this_week", visible: true, wide: false },
  { key: "spent_this_month", visible: true, wide: false },
  { key: "biggest_expense_this_month", visible: true, wide: true },
  { key: "income_this_month", visible: false, wide: false },
  { key: "net_this_month", visible: false, wide: false },
  { key: "biggest_income_this_month", visible: false, wide: false },
  { key: "bills_next_7_days", visible: false, wide: false },
];

/** Ensures every catalog widget has an entry, appending any the user's saved prefs predate. */
export function normalizeWidgetPrefs(saved: WidgetPref[] | null | undefined): WidgetPref[] {
  if (!saved || saved.length === 0) return DEFAULT_WIDGETS;
  const known = new Set(saved.map((w) => w.key));
  const missing = DEFAULT_WIDGETS.filter((d) => !known.has(d.key));
  return [...saved, ...missing];
}

/** Lays widgets out in display order: a "wide" widget fills its own row, others pair up two-per-row. */
export function layoutRows(widgets: WidgetPref[]): WidgetPref[][] {
  const rows: WidgetPref[][] = [];
  let pair: WidgetPref[] = [];

  const flushPair = () => {
    if (pair.length) {
      rows.push(pair);
      pair = [];
    }
  };

  for (const w of widgets) {
    if (w.wide) {
      flushPair();
      rows.push([w]);
    } else {
      pair.push(w);
      if (pair.length === 2) flushPair();
    }
  }
  flushPair();

  return rows;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayYmd(now = new Date()) {
  return ymd(now);
}

function addDays(d: Date, days: number) {
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date;
}

function startOfWeek(d: Date) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date;
}

function endOfWeek(start: Date) {
  return addDays(start, 6);
}

export function computeWidgetValues(transactions: Transaction[], startingBalance: number, now = new Date()) {
  const today = ymd(now);
  const weekStart = ymd(startOfWeek(now));
  const weekEnd = ymd(endOfWeek(startOfWeek(now)));
  const monthStart = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const next7End = ymd(addDays(now, 6));

  let currentBalance = startingBalance;
  let endOfMonthProjection = startingBalance;
  let billsToPay = 0;
  let billsNext7Days = 0;
  let incomingThisWeek = 0;
  let paidThisWeek = 0;
  let spentThisMonth = 0;
  let incomeThisMonth = 0;
  let biggestExpenseThisMonth = 0;
  let biggestIncomeThisMonth = 0;

  for (const t of transactions) {
    const amount = Number(t.amount);
    const date = t.date;
    const isPast = date <= today;

    if (isPast) currentBalance += amount;
    if (date <= monthEnd) endOfMonthProjection += amount;

    if (amount < 0) {
      const spent = -amount;
      if (isPast && date >= monthStart) {
        spentThisMonth += spent;
        if (spent > biggestExpenseThisMonth) biggestExpenseThisMonth = spent;
      }
      if (!isPast && date <= monthEnd) billsToPay += spent;
      if (!isPast && date >= today && date <= next7End) billsNext7Days += spent;
      if (isPast && date >= weekStart) paidThisWeek += spent;
    } else if (amount > 0) {
      if (date >= today && date <= weekEnd) incomingThisWeek += amount;
      if (isPast && date >= monthStart) {
        incomeThisMonth += amount;
        if (amount > biggestIncomeThisMonth) biggestIncomeThisMonth = amount;
      }
    }
  }

  return {
    currentBalance,
    end_of_month_projection: endOfMonthProjection,
    bills_to_pay: billsToPay,
    bills_next_7_days: billsNext7Days,
    incoming_this_week: incomingThisWeek,
    paid_this_week: paidThisWeek,
    spent_this_month: spentThisMonth,
    income_this_month: incomeThisMonth,
    net_this_month: incomeThisMonth - spentThisMonth,
    biggest_expense_this_month: biggestExpenseThisMonth,
    biggest_income_this_month: biggestIncomeThisMonth,
  } satisfies Record<WidgetKey | "currentBalance", number>;
}
