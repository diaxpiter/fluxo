import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddTransactionFab } from "@/app/dashboard/add-transaction-fab";
import { ImportTransactions } from "@/app/dashboard/import-transactions";
import { TransactionList } from "@/app/dashboard/transaction-list";
import { MonthGroup } from "@/app/dashboard/history/month-group";
import { cardClass } from "@/lib/ui";
import { getDashboardContext, getLedgerRows, groupByMonth } from "@/lib/dashboard-data";
import { getDictionary, getLocale } from "@/lib/i18n/dictionary";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const locale = await getLocale();
  const t = getDictionary(locale);

  const { account, categories, currency } = await getDashboardContext(supabase, user.id);
  const rows = await getLedgerRows(supabase, account?.id ?? null, account?.starting_balance ?? 0);
  const months = groupByMonth(rows, locale);

  return (
    <main className="flex flex-1 flex-col px-4 pb-24 pt-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{t.history.title}</h1>
          {account && (
            <ImportTransactions accountId={account.id} currency={currency} locale={locale} t={t.importTransactions} />
          )}
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
          />
        ) : (
          <div className="flex flex-col gap-3">
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
                defaultOpen={i === 0}
              />
            ))}
          </div>
        )}
      </div>

      {account && (
        <AddTransactionFab
          accountId={account.id}
          categories={categories}
          t={t.addTransaction}
          addCategoryT={t.addCategory}
          common={t.common}
        />
      )}
    </main>
  );
}
