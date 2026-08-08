import type { IncomeSource, RecurringBill, Transaction } from "@/lib/types";

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

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function monthBoundsYmd(now = new Date()) {
  return {
    start: ymd(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

/** This month's occurrence of a recurring bill's due day, clamped to the month's last day. */
function dueDateThisMonth(dueDayOfMonth: number, now: Date) {
  const day = Math.min(dueDayOfMonth, daysInMonth(now.getFullYear(), now.getMonth()));
  return ymd(new Date(now.getFullYear(), now.getMonth(), day));
}

function parseYmd(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Every date this bill falls due within the current month, as YMD strings. Monthly and yearly
 * bills land at most once; weekly lands every matching weekday, bi-weekly every other one
 * (aligned to `anchor_date`, since "every other Tuesday" needs a reference point to know which
 * Tuesdays count).
 */
export function billOccurrencesInMonth(bill: RecurringBill, now = new Date()): string[] {
  if (bill.recurrence_type === "monthly") {
    return bill.due_day_of_month == null ? [] : [dueDateThisMonth(bill.due_day_of_month, now)];
  }

  if (bill.recurrence_type === "yearly") {
    if (bill.due_month == null || bill.due_day_of_month == null || now.getMonth() + 1 !== bill.due_month) return [];
    return [dueDateThisMonth(bill.due_day_of_month, now)];
  }

  if (bill.due_day_of_week == null) return [];
  const anchor = bill.anchor_date ? parseYmd(bill.anchor_date) : null;
  const { start: monthStart, end: monthEnd } = monthBoundsYmd(now);

  const occurrences: string[] = [];
  let d = parseYmd(monthStart);
  const end = parseYmd(monthEnd);
  while (d <= end) {
    if (d.getDay() === bill.due_day_of_week) {
      if (bill.recurrence_type === "weekly" || !anchor) {
        occurrences.push(ymd(d));
      } else {
        const diffDays = Math.round((d.getTime() - anchor.getTime()) / 86_400_000);
        if (((diffDays % 14) + 14) % 14 === 0) occurrences.push(ymd(d));
      }
    }
    d = addDays(d, 1);
  }
  return occurrences;
}

/**
 * Which of this bill's occurrences this month are still unpaid. Matches each already-paid
 * transaction to its *nearest* occurrence date rather than assuming payments happen in
 * chronological order -- paying a later occurrence before an earlier one used to miscount
 * which occurrence was still due (the earlier one would silently drop off the list while the
 * paid one kept showing as owed).
 */
export function remainingBillOccurrences(
  bill: RecurringBill,
  transactionsThisMonth: Pick<Transaction, "recurring_bill_id" | "date">[],
  now = new Date(),
) {
  const occurrences = billOccurrencesInMonth(bill, now);
  const paidDates = transactionsThisMonth
    .filter((t) => t.recurring_bill_id === bill.id)
    .map((t) => t.date)
    .sort();

  const unclaimed = [...occurrences];
  for (const paidDate of paidDates) {
    if (unclaimed.length === 0) break;
    const paidTime = parseYmd(paidDate).getTime();
    let bestIndex = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < unclaimed.length; i++) {
      const diff = Math.abs(parseYmd(unclaimed[i]).getTime() - paidTime);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIndex = i;
      }
    }
    unclaimed.splice(bestIndex, 1);
  }
  return unclaimed;
}

function isWeekend(d: Date) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/**
 * This month's occurrence of a fixed income source's day, clamped to the month's
 * last day, shifted off weekends per weekendRule. Holiday-awareness isn't
 * implemented yet — a payday landing on a public holiday won't shift until a
 * real holiday calendar is wired up.
 */
function shiftedDateThisMonth(dayOfMonth: number, weekendRule: IncomeSource["weekend_holiday_rule"], now: Date) {
  const day = Math.min(dayOfMonth, daysInMonth(now.getFullYear(), now.getMonth()));
  let date = new Date(now.getFullYear(), now.getMonth(), day);

  if (weekendRule !== "none") {
    const step = weekendRule === "shift_earlier" ? -1 : 1;
    while (isWeekend(date)) date = addDays(date, step);
  }

  return ymd(date);
}

export function computeWidgetValues(
  transactions: Transaction[],
  startingBalance: number,
  recurringBills: RecurringBill[] = [],
  incomeSources: IncomeSource[] = [],
  now = new Date(),
) {
  const today = ymd(now);
  const weekStart = ymd(startOfWeek(now));
  const weekEnd = ymd(endOfWeek(startOfWeek(now)));
  const { start: monthStart, end: monthEnd } = monthBoundsYmd(now);
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
    if (t.transfer_group_id) continue; // moves money between the user's own accounts — not real spend/income

    if (amount < 0) {
      const spent = -amount;
      if (isPast && date >= monthStart) {
        spentThisMonth += spent;
        if (spent > biggestExpenseThisMonth) biggestExpenseThisMonth = spent;
      }
      // Only transactions already linked to a recurring bill (e.g. paid ahead via "Pay bill")
      // count here -- otherwise any future-dated ad-hoc expense would inflate "bills to pay"
      // with spending that isn't a bill, and a bill paid via the generic add-transaction form
      // (no recurring_bill_id) would get double-counted against its still-"unclaimed" occurrence.
      if (!isPast && date <= monthEnd && t.recurring_bill_id) billsToPay += spent;
      if (!isPast && date >= today && date <= next7End && t.recurring_bill_id) billsNext7Days += spent;
      if (isPast && date >= weekStart) paidThisWeek += spent;
    } else if (amount > 0) {
      if (date >= today && date <= weekEnd) incomingThisWeek += amount;
      if (isPast && date >= monthStart) {
        incomeThisMonth += amount;
        if (amount > biggestIncomeThisMonth) biggestIncomeThisMonth = amount;
      }
    }
  }

  const transactionsThisMonth = transactions.filter((t) => t.date >= monthStart && t.date <= monthEnd);

  for (const bill of recurringBills) {
    if (!bill.is_active) continue;
    const amount = bill.is_variable ? bill.estimated_amount ?? 0 : bill.amount ?? 0;
    const remaining = remainingBillOccurrences(bill, transactionsThisMonth, now);

    for (const dueDate of remaining) {
      billsToPay += amount;
      if (dueDate <= monthEnd) endOfMonthProjection -= amount;
      if (dueDate >= today && dueDate <= next7End) billsNext7Days += amount;
    }
  }

  const receivedIncomeSourceIds = new Set(
    transactions
      .filter((t) => t.income_source_id && t.date >= monthStart && t.date <= monthEnd)
      .map((t) => t.income_source_id),
  );

  for (const source of incomeSources) {
    if (
      !source.is_active ||
      source.schedule_type !== "fixed_monthly_date" ||
      source.day_of_month == null ||
      receivedIncomeSourceIds.has(source.id)
    ) {
      continue;
    }
    const amount = source.is_variable ? source.estimated_amount ?? 0 : source.expected_amount ?? 0;
    const expectedDate = shiftedDateThisMonth(source.day_of_month, source.weekend_holiday_rule, now);
    if (expectedDate <= monthEnd) endOfMonthProjection += amount;
    if (expectedDate >= today && expectedDate <= weekEnd) {
      incomingThisWeek += amount;
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

/** One account's actual daily balance over the trailing `days` days (today included), for a sparkline. */
export function computeAccountBalanceTrend(
  transactions: Transaction[],
  startingBalance: number,
  days = 30,
  now = new Date(),
): number[] {
  const today = todayYmd(now);
  const windowStart = ymd(addDays(now, -(days - 1)));

  let baseline = startingBalance;
  const deltaByDate = new Map<string, number>();
  for (const t of transactions) {
    if (t.date > today) continue;
    if (t.date < windowStart) {
      baseline += Number(t.amount);
    } else {
      deltaByDate.set(t.date, (deltaByDate.get(t.date) ?? 0) + Number(t.amount));
    }
  }

  const points: number[] = [];
  let running = baseline;
  let d = parseYmd(windowStart);
  for (let i = 0; i < days; i++) {
    running += deltaByDate.get(ymd(d)) ?? 0;
    points.push(running);
    d = addDays(d, 1);
  }
  return points;
}

/**
 * Day-by-day trajectory across the current month, blending real transactions with the same
 * remaining-bill / expected-income projection `computeWidgetValues` uses -- the last point
 * always equals that function's `end_of_month_projection`.
 */
export function computeProjectionTrend(
  transactions: Transaction[],
  startingBalance: number,
  recurringBills: RecurringBill[] = [],
  incomeSources: IncomeSource[] = [],
  now = new Date(),
): number[] {
  const { start: monthStart, end: monthEnd } = monthBoundsYmd(now);

  let baseline = startingBalance;
  const deltaByDate = new Map<string, number>();
  for (const t of transactions) {
    const amount = Number(t.amount);
    if (t.date < monthStart) baseline += amount;
    else if (t.date <= monthEnd) deltaByDate.set(t.date, (deltaByDate.get(t.date) ?? 0) + amount);
  }

  const transactionsThisMonth = transactions.filter((t) => t.date >= monthStart && t.date <= monthEnd);

  for (const bill of recurringBills) {
    if (!bill.is_active) continue;
    const amount = bill.is_variable ? bill.estimated_amount ?? 0 : bill.amount ?? 0;
    for (const dueDate of remainingBillOccurrences(bill, transactionsThisMonth, now)) {
      if (dueDate <= monthEnd) deltaByDate.set(dueDate, (deltaByDate.get(dueDate) ?? 0) - amount);
    }
  }

  const receivedIncomeSourceIds = new Set(
    transactions
      .filter((t) => t.income_source_id && t.date >= monthStart && t.date <= monthEnd)
      .map((t) => t.income_source_id),
  );
  for (const source of incomeSources) {
    if (
      !source.is_active ||
      source.schedule_type !== "fixed_monthly_date" ||
      source.day_of_month == null ||
      receivedIncomeSourceIds.has(source.id)
    ) {
      continue;
    }
    const amount = source.is_variable ? source.estimated_amount ?? 0 : source.expected_amount ?? 0;
    const expectedDate = shiftedDateThisMonth(source.day_of_month, source.weekend_holiday_rule, now);
    if (expectedDate <= monthEnd) deltaByDate.set(expectedDate, (deltaByDate.get(expectedDate) ?? 0) + amount);
  }

  const points: number[] = [];
  let running = baseline;
  let d = parseYmd(monthStart);
  const end = parseYmd(monthEnd);
  while (d <= end) {
    running += deltaByDate.get(ymd(d)) ?? 0;
    points.push(running);
    d = addDays(d, 1);
  }
  return points;
}
