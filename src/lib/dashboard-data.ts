import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeWidgetPrefs, type WidgetPref } from "@/lib/widgets";
import type { Account, Category, Transaction } from "@/lib/types";

export async function getDashboardContext(supabase: SupabaseClient, userId: string) {
  const [{ data: profile }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("profiles").select("currency, widgets").eq("id", userId).single(),
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
  ]);

  const account = (accounts as Account[] | null)?.[0] ?? null;
  const currency = profile?.currency ?? "EUR";
  const categoryList = (categories as Category[] | null) ?? [];
  const widgetPrefs = normalizeWidgetPrefs(profile?.widgets as WidgetPref[] | null);

  return { account, categories: categoryList, currency, widgetPrefs };
}

/** The account-creation trigger seeds every new account with this literal English name. */
const DEFAULT_ACCOUNT_NAME = "Main Account";

export function accountDisplayName(account: Account, mainAccountLabel: string): string {
  return account.name === DEFAULT_ACCOUNT_NAME ? mainAccountLabel : account.name;
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
