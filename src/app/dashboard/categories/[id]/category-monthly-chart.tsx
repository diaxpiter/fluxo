import { formatCurrency } from "@/lib/currency";
import { cardClass, numericClass } from "@/lib/ui";
import type { MonthlyBucket } from "@/lib/category-analytics";
import type { Dictionary } from "@/lib/i18n/dictionary";

const STRIPES = "repeating-linear-gradient(135deg, #10b981 0 4px, rgba(16,185,129,0.35) 4px 8px)";

export function CategoryMonthlyChart({
  buckets,
  monthlyAverage,
  currency,
  locale,
  t,
}: {
  buckets: MonthlyBucket[];
  monthlyAverage: number;
  currency: string;
  locale: string;
  t: Dictionary["categoryDetail"];
}) {
  const maxTotal = Math.max(...buckets.map((b) => b.total), 1);
  const avgPercent = Math.min(100, (monthlyAverage / maxTotal) * 100);
  const monthFormat = new Intl.DateTimeFormat(locale, { month: "short" });

  return (
    <div className={cardClass}>
      <div className="flex items-baseline justify-between px-4 pt-4">
        <h2 className="text-sm font-semibold">{t.chartHeading}</h2>
        <span className="text-xs text-foreground/50">{t.averageLegend}</span>
      </div>

      <div className="overflow-x-auto px-4 pb-4 pt-2.5">
        <div className="relative flex h-36 min-w-full items-end gap-2" style={{ minWidth: `${buckets.length * 40}px` }}>
          <div
            className="absolute inset-x-0 border-t border-dashed border-foreground/30"
            style={{ bottom: `${avgPercent}%` }}
          >
            <span className="absolute right-0 -top-4 bg-background px-1 text-[10px] text-foreground/50">
              {formatCurrency(monthlyAverage, currency, locale)}
            </span>
          </div>

          {buckets.map((bucket) => {
            const [year, month] = bucket.key.split("-").map(Number);
            const label = monthFormat.format(new Date(year, month - 1, 1));
            const heightPercent = Math.max(2, (bucket.total / maxTotal) * 100);

            return (
              <div key={bucket.key} className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <div
                  className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-foreground/10 bg-[#1a1a1a] px-2 py-1 text-[11px] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                  role="tooltip"
                >
                  {label}
                  {bucket.isCurrent ? ` (${t.currentMonthSuffix})` : ""} &middot;{" "}
                  <span className={`font-semibold ${numericClass}`}>{formatCurrency(bucket.total, currency, locale)}</span>
                </div>
                <div
                  tabIndex={0}
                  className="w-full max-w-[34px] rounded-t-[4px] rounded-b-[2px] bg-emerald-500 outline-none transition-opacity group-hover:opacity-80"
                  style={{
                    height: `${heightPercent}%`,
                    backgroundImage: bucket.isCurrent ? STRIPES : undefined,
                  }}
                />
                <span className="text-[10.5px] text-foreground/50">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
