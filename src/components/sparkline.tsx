const WIDTH = 100;
const HEIGHT = 28;

/** A small inline trend line -- no charting library, just an SVG path sized to fill its container. */
export function Sparkline({
  points,
  tone = "neutral",
  className = "",
}: {
  points: number[];
  tone?: "neutral" | "negative" | "positive";
  className?: string;
}) {
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = WIDTH / (points.length - 1);

  const coords = points.map((p, i) => [i * stepX, HEIGHT - ((p - min) / range) * HEIGHT] as const);
  const linePath = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z`;
  const [lastX, lastY] = coords[coords.length - 1];

  const colorClass = tone === "negative" ? "text-red-400" : tone === "positive" ? "text-emerald-500" : "text-foreground/40";

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className={`h-7 w-full ${colorClass} ${className}`}
      aria-hidden="true"
    >
      <path d={areaPath} fill="currentColor" fillOpacity="0.12" stroke="none" />
      <path d={linePath} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="2" fill="currentColor" />
    </svg>
  );
}
