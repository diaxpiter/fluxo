import { formatCurrency } from "@/lib/currency";
import { format } from "@/lib/i18n/format";
import { cardClass, numericClass } from "@/lib/ui";
import type { DescriptionBreakdown } from "@/lib/category-analytics";
import type { Dictionary } from "@/lib/i18n/dictionary";

export function CategoryMerchantBreakdown({
  breakdown,
  currency,
  locale,
  t,
}: {
  breakdown: DescriptionBreakdown;
  currency: string;
  locale: string;
  t: Dictionary["categoryDetail"];
}) {
  if (breakdown.top.length === 0) return null;

  const rows = [
    ...breakdown.top,
    ...(breakdown.otherCount > 0 ? [{ description: t.otherLabel, total: breakdown.otherTotal, count: breakdown.otherCount }] : []),
  ];
  const maxTotal = Math.max(...rows.map((r) => r.total), 1);

  return (
    <div className={cardClass}>
      <div className="px-4 pt-4">
        <h2 className="text-sm font-semibold">{t.whereItGoesHeading}</h2>
      </div>

      <div className="flex flex-col gap-2.5 p-4">
        {rows.map((row) => (
          <div key={row.description} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate">{row.description}</span>
              <span className="shrink-0 text-foreground/50">{format(t.timesCount, { count: row.count })}</span>
              <span className={`shrink-0 ${numericClass}`}>{formatCurrency(row.total, currency, locale)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.max(2, (row.total / maxTotal) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="border-t border-foreground/5 px-4 py-2.5 text-[11px] text-foreground/40">{t.whereItGoesCaveat}</p>
    </div>
  );
}
