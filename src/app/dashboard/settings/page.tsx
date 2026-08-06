import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getAuthenticatedUser, getProfile } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { WidgetCustomizer } from "@/app/dashboard/widget-customizer";
import { LanguageSelector } from "@/app/dashboard/language-selector";
import { AccountManager } from "@/app/dashboard/account-manager";
import { RecurringBillsManager } from "@/app/dashboard/recurring-bills-manager";
import { IncomeSourcesManager } from "@/app/dashboard/income-sources-manager";
import { AllocationRulesManager } from "@/app/dashboard/allocation-rules-manager";
import { SpaceSwitcher } from "@/app/dashboard/space-switcher";
import {
  categoryDisplayName,
  computeAccountBalances,
  getDashboardContext,
  getPaidRecurringBillIds,
  getReceivedIncomeSourceIds,
  getTransactionsForAccounts,
} from "@/lib/dashboard-data";
import { getCurrentSpace } from "@/lib/spaces";
import { getDictionary, getLocale } from "@/lib/i18n/dictionary";
import { cardClass, btnGhostClass } from "@/lib/ui";

export default async function SettingsPage() {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const locale = await getLocale();
  const t = getDictionary(locale);

  const { spaces, currentSpace } = await getCurrentSpace(supabase, user.id);

  const { accounts, categories, currency, widgetPrefs, recurringBills, incomeSources, allocationRules } =
    await getDashboardContext(supabase, user.id, getProfile(user.id), currentSpace);
  const [transactions, paidBillIds, receivedSourceIds] = await Promise.all([
    getTransactionsForAccounts(supabase, accounts.map((a) => a.id)),
    getPaidRecurringBillIds(supabase),
    getReceivedIncomeSourceIds(supabase),
  ]);
  const balances = computeAccountBalances(accounts, transactions);

  return (
    <main className="flex flex-1 flex-col px-4 pb-24 pt-[calc(env(safe-area-inset-top)+2rem)] sm:pt-12 sm:pb-24">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <SpaceSwitcher spaces={spaces} currentSpace={currentSpace} t={t.spaces} common={t.common} />
          <h1 className="text-xl font-semibold tracking-tight">{t.settings.title}</h1>
        </div>

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

        {categories.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-foreground/50">{t.settings.categoriesHeading}</h2>
            <div className={cardClass}>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/dashboard/categories/${category.id}`}
                  className="flex items-center justify-between gap-3 border-b border-foreground/5 p-4 text-sm transition-colors duration-150 last:border-0 hover:bg-foreground/[0.04]"
                >
                  <span className="truncate">{categoryDisplayName(category, t.categories)}</span>
                  <span className="text-foreground/30">›</span>
                </Link>
              ))}
            </div>
          </div>
        )}

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
              allocationRules={allocationRules}
              currency={currency}
              locale={locale}
              t={t}
            />
          </div>
        )}

        {accounts.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-foreground/50">{t.allocationRules.heading}</h2>
            <AllocationRulesManager
              rules={allocationRules}
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
