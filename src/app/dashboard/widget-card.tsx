import { cardClass, numericClass } from "@/lib/ui";
import { SensitiveValue } from "@/components/privacy";

export function WidgetCard({
  title,
  value,
  tone = "neutral",
  delayMs = 0,
}: {
  title: string;
  value: string;
  tone?: "neutral" | "negative" | "positive";
  delayMs?: number;
}) {
  const valueColor =
    tone === "negative" ? "text-red-400" : tone === "positive" ? "text-emerald-500" : "text-foreground";

  return (
    <div
      className={`${cardClass} animate-fade-in-up flex min-h-[100px] flex-1 flex-col justify-between gap-2 p-4`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <p className="text-xs text-foreground/50">{title}</p>
      <p className={`text-xl font-semibold tracking-tight ${numericClass} ${valueColor}`}>
        <SensitiveValue>{value}</SensitiveValue>
      </p>
    </div>
  );
}
