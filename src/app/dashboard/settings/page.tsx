import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { StartingBalanceEditor } from "@/app/dashboard/starting-balance-editor";
import { WidgetCustomizer } from "@/app/dashboard/widget-customizer";
import { LanguageSelector } from "@/app/dashboard/language-selector";
import { RecurringBillsManager } from "@/app/dashboard/recurring-bills-manager";
import { IncomeSourcesManager } from "@/app/dashboard/income-sources-manager";
import {
  accountDisplayName,
  getDashboardContext,
  getPaidRecurringBillIds,
  getReceivedIncomeSourceIds,
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

  const { account, categories, currency, widgetPrefs, recurringBills, incomeSources } = await getDashboardContext(
    supabase,
    user.id,
  );
  const paidBillIds = await getPaidRecurringBillIds(supabase, account?.id ?? null);
  const receivedSourceIds = await getReceivedIncomeSourceIds(supabase, account?.id ?? null);

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

        {account && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-foreground/50">{t.settings.accountHeading}</h2>
            <div className={`${cardClass} flex flex-wrap items-center justify-between gap-3 p-4`}>
              <p className="text-sm">{accountDisplayName(account, t.common.mainAccount)}</p>
              <StartingBalanceEditor
                accountId={account.id}
                startingBalance={account.starting_balance}
                t={t.startingBalance}
                common={t.common}
              />
            </div>
          </div>
        )}

        {account && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-foreground/50">{t.recurringBills.heading}</h2>
            <RecurringBillsManager
              bills={recurringBills}
              paidBillIds={paidBillIds}
              categories={categories}
              accountId={account.id}
              currency={currency}
              locale={locale}
              t={t}
            />
          </div>
        )}

        {account && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-foreground/50">{t.incomeSources.heading}</h2>
            <IncomeSourcesManager
              sources={incomeSources}
              receivedSourceIds={receivedSourceIds}
              categories={categories}
              accountId={account.id}
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
