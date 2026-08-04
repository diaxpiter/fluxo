import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getAuthenticatedUser, getProfile } from "@/lib/supabase/server";
import { RecentActivityList } from "@/app/dashboard/recent-activity-list";
import { WidgetCard } from "@/app/dashboard/widget-card";
import { TransferButton } from "@/app/dashboard/transfer-button";
import { AddTransactionFab } from "@/app/dashboard/add-transaction-fab";
import { formatCurrency } from "@/lib/currency";
import { cardClass, linkClass, numericClass } from "@/lib/ui";
import {
  accountDisplayName,
  computeAccountBalances,
  getDashboardContext,
  getTransactionsForAccounts,
} from "@/lib/dashboard-data";
import { getDictionary, getLocale } from "@/lib/i18n/dictionary";
import { format } from "@/lib/i18n/format";
import { computeWidgetValues, layoutRows, todayYmd, type WidgetKey } from "@/lib/widgets";

const RECENT_COUNT = 5;

function toneFor(key: WidgetKey, value: number): "neutral" | "negative" | "positive" {
  if (key === "end_of_month_projection" || key === "net_this_month") return value < 0 ? "negative" : "neutral";
  if (key === "incoming_this_week" || key === "income_this_month" || key === "biggest_income_this_month") {
    return "positive";
  }
  if (
    key === "bills_to_pay" ||
    key === "bills_next_7_days" ||
    key === "paid_this_week" ||
    key === "spent_this_month" ||
    key === "biggest_expense_this_month"
  ) {
    return "negative";
  }
  return "neutral";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const locale = await getLocale();
  const t = getDictionary(locale);

  const displayName = (user.user_metadata?.display_name as string) || user.email;
  const firstName = displayName?.split(" ")[0];

  const { accounts, categories, currency, widgetPrefs, recurringBills, incomeSources } = await getDashboardContext(
    supabase,
    user.id,
    getProfile(user.id),
  );
  const transactions = await getTransactionsForAccounts(supabase, accounts.map((a) => a.id));
  const balances = computeAccountBalances(accounts, transactions);

  const visibleAccounts = accounts.filter((a) => a.include_in_overview);
  const includedAccountIds = new Set(visibleAccounts.map((a) => a.id));
  const includedTransactions = transactions.filter((tx) => includedAccountIds.has(tx.account_id));
  const includedRecurringBills = recurringBills.filter((b) => includedAccountIds.has(b.account_id));
  const includedIncomeSources = incomeSources.filter((s) => includedAccountIds.has(s.account_id));
  const includedStartingBalance = visibleAccounts.reduce((sum, a) => sum + a.starting_balance, 0);

  const widgetValues = computeWidgetValues(
    includedTransactions,
    includedStartingBalance,
    includedRecurringBills,
    includedIncomeSources,
  );

  const today = todayYmd();
  const recentRows = transactions
    .filter((tx) => tx.date <= today)
    .slice(-RECENT_COUNT)
    .reverse();

  return (
    <main className="flex flex-1 flex-col px-4 pb-24 pt-[calc(env(safe-area-inset-top)+2rem)] sm:pt-12 sm:pb-24">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="min-w-0">
          <p className="text-sm font-medium tracking-tight text-foreground/50">
            <span className="text-emerald-500">.</span>fluxo
          </p>
          <h1 className="mt-2 truncate text-xl font-semibold tracking-tight">
            {format(t.home.greeting, { firstName: firstName ?? "" })}
          </h1>
          <p className="mt-0.5 truncate text-sm text-foreground/50">{user.email}</p>
        </div>

        {accounts.length === 0 ? (
          <div className={`${cardClass} p-6 text-sm text-foreground/50`}>{t.common.settingUpAccount}</div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-foreground/50">{t.accounts.heading}</h2>
                <TransferButton accounts={accounts} t={t} />
              </div>
              {visibleAccounts.length === 0 ? (
                <p className="text-sm text-foreground/50">{t.accounts.empty}</p>
              ) : (
                <div className={cardClass}>
                  {visibleAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between gap-3 border-b border-foreground/5 p-4 last:border-0"
                    >
                      <p className="truncate text-sm text-foreground/70">
                        {accountDisplayName(account, t.common.mainAccount)}
                      </p>
                      <p className={`text-sm font-medium ${numericClass}`}>
                        {formatCurrency(balances.get(account.id) ?? account.starting_balance, currency, locale)}
                      </p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-3 bg-foreground/[0.03] p-4">
                    <p className="text-sm font-medium text-foreground/70">{t.accounts.totalLabel}</p>
                    <p className={`text-sm font-semibold ${numericClass}`}>
                      {formatCurrency(widgetValues.currentBalance, currency, locale)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-foreground/50">{t.home.overview}</h2>
              <div className="flex flex-col gap-3">
                {layoutRows(widgetPrefs.filter((w) => w.visible)).map((rowWidgets, rowIndex) => (
                  <div key={rowWidgets.map((w) => w.key).join("-")} className="flex gap-3">
                    {rowWidgets.map((w, i) => (
                      <WidgetCard
                        key={w.key}
                        title={t.widgets[w.key]}
                        value={formatCurrency(widgetValues[w.key], currency, locale)}
                        delayMs={(rowIndex * 2 + i) * 40}
                        tone={toneFor(w.key, widgetValues[w.key])}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-foreground/50">{t.home.recentActivity}</h2>
                <Link href="/dashboard/history" className={`${linkClass} text-xs`}>
                  {t.home.viewAll}
                </Link>
              </div>
              <RecentActivityList
                rows={recentRows}
                accounts={accounts}
                categories={categories}
                currency={currency}
                locale={locale}
                t={t.transactionList}
                common={t.common}
                categoryLabels={t.categories}
              />
            </div>
          </>
        )}
      </div>

      {accounts.length > 0 && (
        <AddTransactionFab
          accounts={accounts}
          defaultAccountId={(visibleAccounts[0] ?? accounts[0]).id}
          categories={categories}
          t={t.addTransaction}
          addCategoryT={t.addCategory}
          common={t.common}
          categoryLabels={t.categories}
        />
      )}
    </main>
  );
}
