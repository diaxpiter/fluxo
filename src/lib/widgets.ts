import type { Transaction } from "@/lib/types";

export type WidgetKey =
  | "end_of_month_projection"
  | "bills_to_pay"
  | "incoming_this_week"
  | "paid_this_week"
  | "spent_this_month"
  | "biggest_expense_this_month";

export type WidgetPref = {
  key: WidgetKey;
  title: string;
  visible: boolean;
};

export const DEFAULT_WIDGETS: WidgetPref[] = [
  { key: "end_of_month_projection", title: "Predicted balance until end of month", visible: true },
  { key: "bills_to_pay", title: "Bills to be paid this month", visible: true },
  { key: "incoming_this_week", title: "Money to come this week", visible: true },
  { key: "paid_this_week", title: "Amount paid this week", visible: true },
  { key: "spent_this_month", title: "Spent this month", visible: true },
  { key: "biggest_expense_this_month", title: "Biggest expense this month", visible: true },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfWeek(d: Date) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date;
}

function endOfWeek(start: Date) {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

export function computeWidgetValues(transactions: Transaction[], startingBalance: number, now = new Date()) {
  const today = ymd(now);
  const weekStart = ymd(startOfWeek(now));
  const weekEnd = ymd(endOfWeek(startOfWeek(now)));
  const monthStart = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  let currentBalance = startingBalance;
  let endOfMonthProjection = startingBalance;
  let billsToPay = 0;
  let incomingThisWeek = 0;
  let paidThisWeek = 0;
  let spentThisMonth = 0;
  let biggestExpenseThisMonth = 0;

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
      if (isPast && date >= weekStart) paidThisWeek += spent;
    } else if (amount > 0) {
      if (date >= today && date <= weekEnd) incomingThisWeek += amount;
    }
  }

  return {
    currentBalance,
    end_of_month_projection: endOfMonthProjection,
    bills_to_pay: billsToPay,
    incoming_this_week: incomingThisWeek,
    paid_this_week: paidThisWeek,
    spent_this_month: spentThisMonth,
    biggest_expense_this_month: biggestExpenseThisMonth,
  } satisfies Record<WidgetKey | "currentBalance", number>;
}
