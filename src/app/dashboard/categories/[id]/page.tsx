import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient, getAuthenticatedUser, getProfile } from "@/lib/supabase/server";
import { RecentActivityList } from "@/app/dashboard/recent-activity-list";
import { CategoryMonthlyChart } from "./category-monthly-chart";
import { CategoryMerchantBreakdown } from "./category-merchant-breakdown";
import { formatCurrency } from "@/lib/currency";
import { cardClass, numericClass } from "@/lib/ui";
import { categoryDisplayName, getCategoryTransactions, getDashboardContext } from "@/lib/dashboard-data";
import { getCurrentSpace } from "@/lib/spaces";
import { getDictionary, getLocale } from "@/lib/i18n/dictionary";
import { format } from "@/lib/i18n/format";
import {
  CATEGORY_RANGES,
  computeCategoryStats,
  monthlyTotals,
  rangeMonthKeys,
  topDescriptions,
  type CategoryRange,
} from "@/lib/category-analytics";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Category } from "@/lib/types";

const DEFAULT_RANGE: CategoryRange = "6m";

function kindLabel(category: Category, t: Dictionary["categoryDetail"]) {
  const labels = t.kindLabels as Record<string, string>;
  return labels[category.kind] ?? labels.other;
}

export default async function CategoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const locale = await getLocale();
  const t = getDictionary(locale);

  const { currentSpace } = await getCurrentSpace(supabase, user.id);

  const [{ accounts, categories, currency }, { id }, { range: requestedRange }] = await Promise.all([
    getDashboardContext(supabase, user.id, getProfile(user.id), currentSpace),
    params,
    searchParams,
  ]);

  const category = categories.find((c) => c.id === id);
  if (!category) notFound();

  const range: CategoryRange = CATEGORY_RANGES.includes(requestedRange as CategoryRange)
    ? (requestedRange as CategoryRange)
    : DEFAULT_RANGE;

  const accountIds = accounts.map((a) => a.id);
  const transactions = await getCategoryTransactions(supabase, accountIds, category.id);

  const monthKeys = rangeMonthKeys(range, transactions);
  const buckets = monthlyTotals(transactions, monthKeys);
  const transactionsInRange = transactions.filter((tr) => monthKeys.includes(tr.date.slice(0, 7)));
  const stats = computeCategoryStats(buckets, transactionsInRange, range);
  const breakdown = topDescriptions(transactionsInRange);

  const rangeOptions: { key: CategoryRange; label: string }[] = [
    { key: "1m", label: t.categoryDetail.range1m },
    { key: "3m", label: t.categoryDetail.range3m },
    { key: "6m", label: t.categoryDetail.range6m },
    { key: "12m", label: t.categoryDetail.range12m },
    { key: "all", label: t.categoryDetail.rangeAll },
  ];

  const pacing =
    !stats.monthlyAverageIsPartial && stats.monthlyAverage > 0
      ? stats.monthToDate > stats.monthlyAverage
        ? t.categoryDetail.pacingAboveLabel
        : t.categoryDetail.pacingBelowLabel
      : null;

  return (
    <main className="flex flex-1 flex-col px-4 pb-24 pt-[calc(env(safe-area-inset-top)+2rem)] sm:pt-12 sm:pb-24">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/settings"
            aria-label={t.categoryDetail.backLabel}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-foreground/10 text-foreground/50 transition-colors hover:text-foreground"
          >
            ‹
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {categoryDisplayName(category, t.categories)}
            </h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-foreground/50">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              {kindLabel(category, t.categoryDetail)}
            </p>
          </div>
        </div>

        <div className="flex w-fit gap-1 rounded-xl border border-foreground/10 bg-foreground/[0.03] p-1">
          {rangeOptions.map((opt) => (
            <Link
              key={opt.key}
              href={`/dashboard/categories/${category.id}?range=${opt.key}`}
              className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                opt.key === range
                  ? "bg-foreground font-semibold text-background"
                  : "text-foreground/50 hover:text-foreground"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label={t.categoryDetail.totalLabel}
            value={formatCurrency(stats.totalInRange, currency, locale)}
            sub={format(t.categoryDetail.transactionsCount, { count: stats.transactionCount })}
          />
          <StatTile
            label={t.categoryDetail.monthlyAverageLabel}
            value={formatCurrency(stats.monthlyAverage, currency, locale)}
            sub={
              stats.monthlyAverageIsPartial
                ? t.categoryDetail.monthlyAverageNoDataSub
                : format(t.categoryDetail.monthlyAverageSub, { count: stats.completedMonths })
            }
          />
          <StatTile
            label={t.categoryDetail.monthToDateLabel}
            value={formatCurrency(stats.monthToDate, currency, locale)}
            sub={pacing ?? undefined}
            subTone={pacing === t.categoryDetail.pacingAboveLabel ? "up" : pacing ? "down" : "neutral"}
          />
          <StatTile
            label={t.categoryDetail.avgTransactionLabel}
            value={formatCurrency(stats.avgTransaction, currency, locale)}
            sub={format(t.categoryDetail.largestTransactionSub, {
              amount: formatCurrency(stats.largestTransaction, currency, locale),
            })}
          />
        </div>

        <CategoryMonthlyChart
          buckets={buckets}
          monthlyAverage={stats.monthlyAverage}
          currency={currency}
          locale={locale}
          t={t.categoryDetail}
        />

        <CategoryMerchantBreakdown breakdown={breakdown} currency={currency} locale={locale} t={t.categoryDetail} />

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-foreground/50">{t.categoryDetail.transactionsHeading}</h2>
          <RecentActivityList
            rows={[...transactionsInRange].reverse()}
            accounts={accounts}
            categories={categories}
            currency={currency}
            locale={locale}
            t={{ ...t.transactionList, empty: t.categoryDetail.empty }}
            common={t.common}
            categoryLabels={t.categories}
            addCategoryT={t.addCategory}
          />
        </div>
      </div>
    </main>
  );
}

function StatTile({
  label,
  value,
  sub,
  subTone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  subTone?: "neutral" | "up" | "down";
}) {
  const subColor = subTone === "up" ? "text-red-400" : subTone === "down" ? "text-emerald-500" : "text-foreground/50";

  return (
    <div className={`${cardClass} flex min-h-[92px] flex-col justify-between gap-1.5 p-4`}>
      <span className="text-[11.5px] text-foreground/50">{label}</span>
      <span className={`text-lg font-semibold tracking-tight ${numericClass}`}>{value}</span>
      {sub && <span className={`text-[11px] ${subColor}`}>{sub}</span>}
    </div>
  );
}
