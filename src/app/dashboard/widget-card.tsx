import { cardClass, numericClass } from "@/lib/ui";
import { SensitiveValue } from "@/components/privacy";
import { Sparkline } from "@/components/sparkline";

export function WidgetCard({
  title,
  value,
  tone = "neutral",
  delayMs = 0,
  trend,
}: {
  title: string;
  value: string;
  tone?: "neutral" | "negative" | "positive";
  delayMs?: number;
  /** Optional trailing trend, e.g. this month's balance trajectory -- rendered as a small sparkline under the value. */
  trend?: number[];
}) {
  const valueColor =
    tone === "negative" ? "text-red-400" : tone === "positive" ? "text-emerald-500" : "text-foreground";

  return (
    <div
      className={`${cardClass} animate-fade-in-up flex min-h-[100px] flex-1 flex-col justify-between gap-2 p-4`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <p className="text-xs text-foreground/50">{title}</p>
      <div className="flex flex-col gap-1.5">
        <p className={`text-xl font-semibold tracking-tight ${numericClass} ${valueColor}`}>
          <SensitiveValue>{value}</SensitiveValue>
        </p>
        {trend && trend.length > 1 && (
          <SensitiveValue>
            <Sparkline points={trend} tone={tone} />
          </SensitiveValue>
        )}
      </div>
    </div>
  );
}
