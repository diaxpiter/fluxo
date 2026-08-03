import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TransactionList } from "@/app/dashboard/transaction-list";
import { WidgetCard } from "@/app/dashboard/widget-card";
import { formatCurrency } from "@/lib/currency";
import { cardClass, linkClass, numericClass } from "@/lib/ui";
import { accountDisplayName, getDashboardContext, getLedgerRows } from "@/lib/dashboard-data";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const locale = await getLocale();
  const t = getDictionary(locale);

  const displayName = (user.user_metadata?.display_name as string) || user.email;
  const firstName = displayName?.split(" ")[0];

  const { account, categories, currency, widgetPrefs, recurringBills, incomeSources } = await getDashboardContext(
    supabase,
    user.id,
  );
  const rows = await getLedgerRows(supabase, account?.id ?? null, account?.starting_balance ?? 0);
  const today = todayYmd();
  const recentRows = rows.filter((r) => r.date <= today).slice(-RECENT_COUNT);
  const widgetValues = computeWidgetValues(rows, account?.starting_balance ?? 0, recurringBills, incomeSources);

  return (
    <main className="flex flex-1 flex-col px-4 pb-24 pt-8 sm:py-12">
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

        {!account ? (
          <div className={`${cardClass} p-6 text-sm text-foreground/50`}>{t.common.settingUpAccount}</div>
        ) : (
          <>
            <div className={`${cardClass} p-5 sm:p-6`}>
              <p className="text-sm text-foreground/50">{accountDisplayName(account, t.common.mainAccount)}</p>
              <p
                className={`mt-1 text-2xl font-semibold tracking-tight sm:text-3xl ${numericClass} ${
                  widgetValues.currentBalance < 0 ? "text-red-400" : "text-foreground"
                }`}
              >
                {formatCurrency(widgetValues.currentBalance, currency, locale)}
              </p>
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
              <TransactionList
                rows={recentRows}
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
    </main>
  );
}
