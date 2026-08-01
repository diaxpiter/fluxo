import { cardClass, numericClass } from "@/lib/ui";

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
      className={`${cardClass} animate-fade-in-up flex aspect-square flex-col justify-between p-4`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <p className="text-xs text-foreground/50">{title}</p>
      <p className={`text-xl font-semibold tracking-tight ${numericClass} ${valueColor}`}>{value}</p>
    </div>
  );
}
