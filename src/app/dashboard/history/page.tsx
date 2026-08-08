import { redirect } from "next/navigation";
import { createClient, getAuthenticatedUser, getProfile } from "@/lib/supabase/server";
import { AddTransactionFab } from "@/app/dashboard/add-transaction-fab";
import { ImportTransactions } from "@/app/dashboard/import-transactions";
import { TransactionList } from "@/app/dashboard/transaction-list";
import { MonthGroup } from "@/app/dashboard/history/month-group";
import { AccountSwitcher } from "@/app/dashboard/history/account-switcher";
import { SelectionActionBar, SelectionProvider, SelectionToggle } from "@/app/dashboard/history/selection";
import { SpaceSwitcher } from "@/app/dashboard/space-switcher";
import { cardClass } from "@/lib/ui";
import { getDashboardContext, getLedgerRows, groupByMonth } from "@/lib/dashboard-data";
import { getCurrentSpace } from "@/lib/spaces";
import { getDictionary, getLocale } from "@/lib/i18n/dictionary";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const locale = await getLocale();
  const t = getDictionary(locale);

  const { spaces, currentSpace } = await getCurrentSpace(supabase, user.id);

  const [{ accounts, categories, currency }, { account: requestedAccountId }] = await Promise.all([
    getDashboardContext(supabase, user.id, getProfile(user.id), currentSpace),
    searchParams,
  ]);
  const account = accounts.find((a) => a.id === requestedAccountId) ?? accounts[0] ?? null;

  const rows = await getLedgerRows(supabase, account?.id ?? null, account?.starting_balance ?? 0);
  const months = groupByMonth(rows, locale);

  return (
    <SelectionProvider>
    <main className="flex flex-1 flex-col px-4 pb-24 pt-[calc(env(safe-area-inset-top)+2rem)] sm:pt-12 sm:pb-24">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <SpaceSwitcher spaces={spaces} currentSpace={currentSpace} t={t.spaces} common={t.common} />
            <h1 className="text-xl font-semibold tracking-tight">{t.history.title}</h1>
            {account && <AccountSwitcher accounts={accounts} selectedId={account.id} t={t.common} />}
          </div>
          <div className="flex items-center gap-3">
            {months.length > 0 && <SelectionToggle t={t.transactionList} common={t.common} />}
            {account && (
              <ImportTransactions accountId={account.id} currency={currency} locale={locale} t={t.importTransactions} />
            )}
          </div>
        </div>

        {!account ? (
          <div className={`${cardClass} p-6 text-sm text-foreground/50`}>{t.common.settingUpAccount}</div>
        ) : months.length === 0 ? (
          <TransactionList
            rows={[]}
            categories={categories}
            currency={currency}
            locale={locale}
            t={t.transactionList}
            common={t.common}
            categoryLabels={t.categories}
            addCategoryT={t.addCategory}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="hidden grid-cols-[1fr_6rem_6rem_6rem] gap-3 px-4 text-xs font-medium text-foreground/50 sm:grid">
              <span>{t.history.monthColumn}</span>
              <span className="text-right">{t.transactionList.moneyIn}</span>
              <span className="text-right">{t.transactionList.moneyOut}</span>
              <span className="text-right">{t.transactionList.balance}</span>
            </div>
            {months.map((month, i) => (
              <MonthGroup
                key={month.key}
                label={month.label}
                rows={month.rows}
                moneyIn={month.moneyIn}
                moneyOut={month.moneyOut}
                finalBalance={month.finalBalance}
                categories={categories}
                currency={currency}
                locale={locale}
                t={t.transactionList}
                common={t.common}
                categoryLabels={t.categories}
                addCategoryT={t.addCategory}
                defaultOpen={i === 0}
              />
            ))}
          </div>
        )}
      </div>

      {account && (
        <AddTransactionFab
          accounts={accounts}
          defaultAccountId={account.id}
          categories={categories}
          t={t.addTransaction}
          addCategoryT={t.addCategory}
          common={t.common}
          categoryLabels={t.categories}
        />
      )}
      <SelectionActionBar t={t.transactionList} common={t.common} />
    </main>
    </SelectionProvider>
  );
}
