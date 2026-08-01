export function WidgetCard({
  title,
  value,
  tone = "neutral",
}: {
  title: string;
  value: string;
  tone?: "neutral" | "negative" | "positive";
}) {
  const valueColor =
    tone === "negative" ? "text-red-500" : tone === "positive" ? "text-emerald-500" : "text-foreground";

  return (
    <div className="flex aspect-square flex-col justify-between rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
      <p className="text-xs text-foreground/60">{title}</p>
      <p className={`text-xl font-semibold tracking-tight tabular-nums ${valueColor}`}>{value}</p>
    </div>
  );
}
