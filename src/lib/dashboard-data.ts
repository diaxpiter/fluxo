import type { SupabaseClient } from "@supabase/supabase-js";
import { monthBoundsYmd, normalizeWidgetPrefs, todayYmd, type WidgetPref } from "@/lib/widgets";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Account, AllocationRule, Category, IncomeSource, RecurringBill, Transaction } from "@/lib/types";

type ProfileRow = { currency: string | null; widgets: WidgetPref[] | null } | null;

/**
 * `profile` is passed in (rather than queried here) so callers can fetch it via the cached
 * `getProfile` in `@/lib/supabase/server` -- shared with the layout's own profile lookup -- while
 * keeping this file free of server-only imports, since it's also imported by client components.
 */
export async function getDashboardContext(
  supabase: SupabaseClient,
  userId: string,
  profile: ProfileRow | Promise<ProfileRow>,
) {
  const [
    resolvedProfile,
    { data: accounts },
    { data: categories },
    { data: recurringBills },
    { data: incomeSources },
    { data: allocationRules },
  ] = await Promise.all([
    profile,
    supabase
      .from("accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("categories")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("recurring_bills")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("income_sources")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("allocation_rules")
      .select("*")
      .eq("user_id", userId)
      .order("priority_order", { ascending: true }),
  ]);

  const accountList = (accounts as Account[] | null) ?? [];
  const currency = resolvedProfile?.currency ?? "EUR";
  const categoryList = (categories as Category[] | null) ?? [];
  const widgetPrefs = normalizeWidgetPrefs(resolvedProfile?.widgets as WidgetPref[] | null);
  const recurringBillList = (recurringBills as RecurringBill[] | null) ?? [];
  const incomeSourceList = (incomeSources as IncomeSource[] | null) ?? [];
  const allocationRuleList = (allocationRules as AllocationRule[] | null) ?? [];

  return {
    accounts: accountList,
    categories: categoryList,
    currency,
    widgetPrefs,
    recurringBills: recurringBillList,
    incomeSources: incomeSourceList,
    allocationRules: allocationRuleList,
  };
}

/** The account-creation trigger seeds every new account with this literal English name. */
const DEFAULT_ACCOUNT_NAME = "Main Account";

export function accountDisplayName(account: Account, mainAccountLabel: string): string {
  return account.name === DEFAULT_ACCOUNT_NAME ? mainAccountLabel : account.name;
}

/** The signup trigger seeds every new account with these literal English category names. */
const SEED_CATEGORY_LABELS: Record<string, keyof Dictionary["categories"]> = {
  Income: "income",
  Housing: "housing",
  Utilities: "utilities",
  Subscriptions: "subscriptions",
  Savings: "savings",
  Discretionary: "discretionary",
  Other: "other",
};

export function categoryDisplayName(category: Category, categoryLabels: Dictionary["categories"]): string {
  const key = SEED_CATEGORY_LABELS[category.name];
  return key ? categoryLabels[key] : category.name;
}

/** Ids of recurring bills already paid (linked to a real transaction) this month. */
export async function getPaidRecurringBillIds(
  supabase: SupabaseClient,
  now = new Date(),
): Promise<string[]> {
  const { start, end } = monthBoundsYmd(now);
  const { data } = await supabase
    .from("transactions")
    .select("recurring_bill_id")
    .not("recurring_bill_id", "is", null)
    .gte("date", start)
    .lte("date", end);

  return (data ?? []).map((row) => row.recurring_bill_id as string);
}

/** Ids of income sources already received (linked to a real transaction) this month. */
export async function getReceivedIncomeSourceIds(supabase: SupabaseClient, now = new Date()): Promise<string[]> {
  const { start, end } = monthBoundsYmd(now);
  const { data } = await supabase
    .from("transactions")
    .select("income_source_id")
    .not("income_source_id", "is", null)
    .gte("date", start)
    .lte("date", end);

  return (data ?? []).map((row) => row.income_source_id as string);
}

export type LedgerRow = Transaction & { balance: number };

export async function getLedgerRows(
  supabase: SupabaseClient,
  accountId: string | null,
  startingBalance: number,
): Promise<LedgerRow[]> {
  if (!accountId) return [];

  const { data: rawTransactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("account_id", accountId)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  const transactions = (rawTransactions as Transaction[] | null) ?? [];

  return transactions.reduce<LedgerRow[]>((acc, t) => {
    const previousBalance = acc.at(-1)?.balance ?? startingBalance;
    acc.push({ ...t, balance: previousBalance + Number(t.amount) });
    return acc;
  }, []);
}

/** Like getLedgerRows but across multiple accounts, without a running balance (meaningless mixed across accounts). */
export async function getTransactionsForAccounts(
  supabase: SupabaseClient,
  accountIds: string[],
): Promise<Transaction[]> {
  if (accountIds.length === 0) return [];

  const { data } = await supabase
    .from("transactions")
    .select("*")
    .in("account_id", accountIds)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  return (data as Transaction[] | null) ?? [];
}

/** Each account's starting balance plus the sum of its own past transactions. */
export function computeAccountBalances(
  accounts: Account[],
  transactions: Transaction[],
  now = new Date(),
): Map<string, number> {
  const today = todayYmd(now);
  const balances = new Map(accounts.map((a) => [a.id, a.starting_balance]));

  for (const t of transactions) {
    if (t.date <= today) {
      balances.set(t.account_id, (balances.get(t.account_id) ?? 0) + Number(t.amount));
    }
  }

  return balances;
}

export type MonthGroupData = {
  key: string;
  label: string;
  rows: LedgerRow[];
  moneyIn: number;
  moneyOut: number;
  finalBalance: number;
};

export function groupByMonth(rows: LedgerRow[], locale: string): MonthGroupData[] {
  const monthLabelFormat = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const groups = new Map<string, LedgerRow[]>();

  for (const row of rows) {
    const key = row.date.slice(0, 7); // YYYY-MM
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, monthRows]) => {
      const [year, month] = key.split("-").map(Number);
      let moneyIn = 0;
      let moneyOut = 0;
      for (const row of monthRows) {
        const amount = Number(row.amount);
        if (amount >= 0) moneyIn += amount;
        else moneyOut += -amount;
      }

      return {
        key,
        label: monthLabelFormat.format(new Date(year, month - 1, 1)),
        rows: monthRows,
        moneyIn,
        moneyOut,
        finalBalance: monthRows.at(-1)!.balance,
      };
    });
}
