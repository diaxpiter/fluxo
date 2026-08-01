import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { TransactionList } from "@/app/dashboard/transaction-list";
import { StartingBalanceEditor } from "@/app/dashboard/starting-balance-editor";
import { AddTransactionFab } from "@/app/dashboard/add-transaction-fab";
import { WidgetCard } from "@/app/dashboard/widget-card";
import { WidgetCustomizer } from "@/app/dashboard/widget-customizer";
import { formatCurrency } from "@/lib/currency";
import { cardClass, btnGhostClass, numericClass } from "@/lib/ui";
import { computeWidgetValues, DEFAULT_WIDGETS, type WidgetPref } from "@/lib/widgets";
import type { Account, Category, Transaction } from "@/lib/types";

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
    <main className="flex flex-1 flex-col px-4 py-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium tracking-tight text-foreground/50">
              <span className="text-emerald-500">.</span>fluxo
            </p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight">Hi, {firstName}</h1>
            <p className="mt-0.5 text-sm text-foreground/50">{user.email}</p>
          </div>
          <form action={logout}>
            <button type="submit" className={btnGhostClass}>
              Log out
            </button>
          </form>
        </div>

        {!account ? (
          <div className={`${cardClass} p-6 text-sm text-foreground/50`}>Setting up your account…</div>
        ) : (
          <>
            <div className={`${cardClass} flex items-end justify-between p-6`}>
              <div>
                <p className="text-sm text-foreground/50">{account.name}</p>
                <p
                  className={`mt-1 text-3xl font-semibold tracking-tight ${numericClass} ${
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

              <div className="flex flex-wrap gap-3">
                {widgetPrefs
                  .filter((w) => w.visible)
                  .map((w, i) => (
                    <WidgetCard
                      key={w.key}
                      title={w.title}
                      value={formatCurrency(widgetValues[w.key], currency)}
                      delayMs={i * 40}
                      tone={
                        w.key === "end_of_month_projection"
                          ? widgetValues[w.key] < 0
                            ? "negative"
                            : "neutral"
                          : w.key === "incoming_this_week"
                            ? "positive"
                            : w.key === "bills_to_pay" || w.key === "paid_this_week" || w.key === "spent_this_month"
                              ? "negative"
                              : "neutral"
                      }
                    />
                  ))}
              </div>
            </div>

            <TransactionList rows={rows} categories={categoryList} currency={currency} />
          </>
        )}
      </div>

      {account && <AddTransactionFab accountId={account.id} categories={categoryList} />}
    </main>
  );
}
