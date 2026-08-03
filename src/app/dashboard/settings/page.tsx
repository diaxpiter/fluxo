import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { WidgetCustomizer } from "@/app/dashboard/widget-customizer";
import { LanguageSelector } from "@/app/dashboard/language-selector";
import { AccountManager } from "@/app/dashboard/account-manager";
import { RecurringBillsManager } from "@/app/dashboard/recurring-bills-manager";
import { IncomeSourcesManager } from "@/app/dashboard/income-sources-manager";
import {
  computeAccountBalances,
  getDashboardContext,
  getPaidRecurringBillIds,
  getReceivedIncomeSourceIds,
  getTransactionsForAccounts,
} from "@/lib/dashboard-data";
import { getDictionary, getLocale } from "@/lib/i18n/dictionary";
import { cardClass, btnGhostClass } from "@/lib/ui";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const locale = await getLocale();
  const t = getDictionary(locale);

  const { accounts, categories, currency, widgetPrefs, recurringBills, incomeSources } = await getDashboardContext(
    supabase,
    user.id,
  );
  const transactions = await getTransactionsForAccounts(supabase, accounts.map((a) => a.id));
  const balances = computeAccountBalances(accounts, transactions);
  const paidBillIds = await getPaidRecurringBillIds(supabase);
  const receivedSourceIds = await getReceivedIncomeSourceIds(supabase);

  return (
    <main className="flex flex-1 flex-col px-4 pb-24 pt-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <h1 className="text-xl font-semibold tracking-tight">{t.settings.title}</h1>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-foreground/50">{t.settings.widgetsHeading}</h2>
          <div className={`${cardClass} p-4`}>
            <WidgetCustomizer widgets={widgetPrefs} t={t.widgetCustomizer} widgetTitles={t.widgets} common={t.common} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-foreground/50">{t.accounts.heading}</h2>
          <AccountManager accounts={accounts} balances={balances} currency={currency} locale={locale} t={t} />
        </div>

        {accounts.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-foreground/50">{t.recurringBills.heading}</h2>
            <RecurringBillsManager
              bills={recurringBills}
              paidBillIds={paidBillIds}
              categories={categories}
              accounts={accounts}
              currency={currency}
              locale={locale}
              t={t}
            />
          </div>
        )}

        {accounts.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-foreground/50">{t.incomeSources.heading}</h2>
            <IncomeSourcesManager
              sources={incomeSources}
              receivedSourceIds={receivedSourceIds}
              categories={categories}
              accounts={accounts}
              currency={currency}
              locale={locale}
              t={t}
            />
          </div>
        )}

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-foreground/50">{t.settings.languageHeading}</h2>
          <div className={`${cardClass} p-4`}>
            <LanguageSelector current={locale} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-foreground/50">{t.settings.sessionHeading}</h2>
          <div className={`${cardClass} flex items-center justify-between gap-3 p-4`}>
            <p className="text-sm text-foreground/50">{user.email}</p>
            <form action={logout}>
              <button type="submit" className={btnGhostClass}>
                {t.settings.logOut}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
