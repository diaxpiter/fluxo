import type { Transaction } from "@/lib/types";

export type CategoryRange = "1m" | "3m" | "6m" | "12m" | "all";

export const CATEGORY_RANGES: CategoryRange[] = ["1m", "3m", "6m", "12m", "all"];

const RANGE_MONTHS: Record<CategoryRange, number | null> = {
  "1m": 1,
  "3m": 3,
  "6m": 6,
  "12m": 12,
  all: null,
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function monthKey(year: number, monthIndex: number) {
  return `${year}-${pad(monthIndex + 1)}`;
}

export function currentMonthKey(now = new Date()) {
  return monthKey(now.getFullYear(), now.getMonth());
}

/**
 * The month keys (YYYY-MM) this range covers, oldest first, always ending with the current
 * (possibly partial) month. "all" instead spans every month that actually has a transaction,
 * so an account with years of history doesn't render an empty bar per month back to account
 * creation.
 */
export function rangeMonthKeys(range: CategoryRange, transactions: Transaction[], now = new Date()): string[] {
  const months = RANGE_MONTHS[range];
  const thisMonth = currentMonthKey(now);

  if (months == null) {
    const keys = new Set(transactions.map((t) => t.date.slice(0, 7)));
    keys.add(thisMonth);
    return [...keys].sort();
  }

  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return monthKey(d.getFullYear(), d.getMonth());
  });
}

export type MonthlyBucket = { key: string; total: number; isCurrent: boolean };

/** One bucket per month key, summing the *magnitude* of every transaction dated in that month. */
export function monthlyTotals(transactions: Transaction[], monthKeys: string[], now = new Date()): MonthlyBucket[] {
  const thisMonth = currentMonthKey(now);
  const totals = new Map<string, number>();

  for (const t of transactions) {
    const key = t.date.slice(0, 7);
    if (!monthKeys.includes(key)) continue;
    totals.set(key, (totals.get(key) ?? 0) + Math.abs(Number(t.amount)));
  }

  return monthKeys.map((key) => ({ key, total: totals.get(key) ?? 0, isCurrent: key === thisMonth }));
}

export type CategoryStats = {
  totalInRange: number;
  monthlyAverage: number;
  /** True when the range's only month is the current one -- there's no "average" over zero completed months. */
  monthlyAverageIsPartial: boolean;
  completedMonths: number;
  monthToDate: number;
  transactionCount: number;
  avgTransaction: number;
  largestTransaction: number;
};

export type DescriptionBucket = { description: string; total: number; count: number };

export type DescriptionBreakdown = {
  top: DescriptionBucket[];
  otherTotal: number;
  otherCount: number;
};

/**
 * Ranks transactions by (trimmed, case-insensitive) description -- there's no separate merchant
 * field, so this is an approximation: "Continente Alfragide" and "continente alfragide " group
 * together, but "Continente Alfragide" and "Continente Amadora" don't.
 */
export function topDescriptions(transactions: Transaction[], limit = 5): DescriptionBreakdown {
  const groups = new Map<string, { display: string; total: number; count: number }>();

  for (const t of transactions) {
    const trimmed = t.description.trim();
    if (!trimmed) continue;
    const key = trimmed.toUpperCase();
    const amount = Math.abs(Number(t.amount));
    const existing = groups.get(key);
    if (existing) {
      existing.total += amount;
      existing.count += 1;
    } else {
      groups.set(key, { display: trimmed, total: amount, count: 1 });
    }
  }

  const sorted = [...groups.values()].sort((a, b) => b.total - a.total);
  const top = sorted.slice(0, limit).map(({ display, total, count }) => ({ description: display, total, count }));
  const rest = sorted.slice(limit);

  return {
    top,
    otherTotal: rest.reduce((sum, g) => sum + g.total, 0),
    otherCount: rest.reduce((sum, g) => sum + g.count, 0),
  };
}

export function computeCategoryStats(buckets: MonthlyBucket[], transactionsInRange: Transaction[]): CategoryStats {
  const completed = buckets.filter((b) => !b.isCurrent);
  const current = buckets.find((b) => b.isCurrent);
  const totalInRange = buckets.reduce((sum, b) => sum + b.total, 0);

  const magnitudes = transactionsInRange.map((t) => Math.abs(Number(t.amount)));
  const transactionCount = transactionsInRange.length;

  return {
    totalInRange,
    monthlyAverage:
      completed.length > 0 ? completed.reduce((s, b) => s + b.total, 0) / completed.length : totalInRange,
    monthlyAverageIsPartial: completed.length === 0,
    completedMonths: completed.length,
    monthToDate: current?.total ?? 0,
    transactionCount,
    avgTransaction: transactionCount > 0 ? magnitudes.reduce((s, m) => s + m, 0) / transactionCount : 0,
    largestTransaction: magnitudes.length > 0 ? Math.max(...magnitudes) : 0,
  };
}
