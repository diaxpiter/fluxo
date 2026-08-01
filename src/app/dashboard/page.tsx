import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { TransactionList } from "@/app/dashboard/transaction-list";
import { StartingBalanceEditor } from "@/app/dashboard/starting-balance-editor";
import { AddTransactionFab } from "@/app/dashboard/add-transaction-fab";
import { ImportTransactions } from "@/app/dashboard/import-transactions";
import { WidgetCard } from "@/app/dashboard/widget-card";
import { WidgetCustomizer } from "@/app/dashboard/widget-customizer";
import { formatCurrency } from "@/lib/currency";
import { cardClass, btnGhostClass, numericClass } from "@/lib/ui";
import { computeWidgetValues, groupByTier, DEFAULT_WIDGETS, type WidgetKey, type WidgetPref } from "@/lib/widgets";
import type { Account, Category, Transaction } from "@/lib/types";

function toneFor(key: WidgetKey, value: number): "neutral" | "negative" | "positive" {
  if (key === "end_of_month_projection") return value < 0 ? "negative" : "neutral";
  if (key === "incoming_this_week") return "positive";
  if (key === "bills_to_pay" || key === "paid_this_week" || key === "spent_this_month") return "negative";
  return "neutral";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName = (user.user_metadata?.display_name as string) || user.email;
  const firstName = displayName?.split(" ")[0];

  const [{ data: profile }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("profiles").select("currency, widgets").eq("id", user.id).single(),
    supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  const account = (accounts as Account[] | null)?.[0] ?? null;
  const currency = profile?.currency ?? "EUR";
  const categoryList = (categories as Category[] | null) ?? [];
  const widgetPrefs = (profile?.widgets as WidgetPref[] | null) ?? DEFAULT_WIDGETS;

  const { data: rawTransactions } = account
    ? await supabase
        .from("transactions")
        .select("*")
        .eq("account_id", account.id)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [] as Transaction[] };

  const transactions = (rawTransactions as Transaction[] | null) ?? [];

  const rows = transactions.reduce<Array<Transaction & { balance: number }>>((acc, t) => {
    const previousBalance = acc.at(-1)?.balance ?? account?.starting_balance ?? 0;
    acc.push({ ...t, balance: previousBalance + Number(t.amount) });
    return acc;
  }, []);

  const widgetValues = computeWidgetValues(transactions, account?.starting_balance ?? 0);

  return (
    <main className="flex flex-1 flex-col px-4 pb-28 pt-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium tracking-tight text-foreground/50">
              <span className="text-emerald-500">.</span>fluxo
            </p>
            <h1 className="mt-2 truncate text-xl font-semibold tracking-tight">Hi, {firstName}</h1>
            <p className="mt-0.5 truncate text-sm text-foreground/50">{user.email}</p>
          </div>
          <form action={logout} className="shrink-0">
            <button type="submit" className={btnGhostClass}>
              Log out
            </button>
          </form>
        </div>

        {!account ? (
          <div className={`${cardClass} p-6 text-sm text-foreground/50`}>Setting up your account…</div>
        ) : (
          <>
            <div className={`${cardClass} flex flex-wrap items-end justify-between gap-3 p-5 sm:p-6`}>
              <div className="min-w-0">
                <p className="text-sm text-foreground/50">{account.name}</p>
                <p
                  className={`mt-1 text-2xl font-semibold tracking-tight sm:text-3xl ${numericClass} ${
                    widgetValues.currentBalance < 0 ? "text-red-400" : "text-foreground"
                  }`}
                >
                  {formatCurrency(widgetValues.currentBalance, currency)}
                </p>
              </div>
              <StartingBalanceEditor accountId={account.id} startingBalance={account.starting_balance} />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-foreground/50">Overview</h2>
                <WidgetCustomizer widgets={widgetPrefs} />
              </div>

              <div className="flex flex-col gap-3">
                {groupByTier(widgetPrefs.filter((w) => w.visible)).map((tierWidgets, tierIndex) => (
                  <div key={tierWidgets.map((w) => w.key).join("-")} className="flex gap-3">
                    {tierWidgets.map((w, i) => (
                      <WidgetCard
                        key={w.key}
                        title={w.title}
                        value={formatCurrency(widgetValues[w.key], currency)}
                        delayMs={(tierIndex * 2 + i) * 40}
                        tone={toneFor(w.key, widgetValues[w.key])}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-foreground/50">Ledger</h2>
                <ImportTransactions accountId={account.id} currency={currency} />
              </div>
              <TransactionList rows={rows} categories={categoryList} currency={currency} />
            </div>
          </>
        )}
      </div>

      {account && <AddTransactionFab accountId={account.id} categories={categoryList} />}
    </main>
  );
}
