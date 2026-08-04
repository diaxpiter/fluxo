import { cardClass } from "@/lib/ui";

function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-foreground/10 ${className}`} />;
}

export default function Loading() {
  return (
    <main className="flex flex-1 flex-col px-4 pb-24 pt-[calc(env(safe-area-inset-top)+2rem)] sm:pt-12 sm:pb-24">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Bar className="h-4 w-16" />
          <Bar className="h-6 w-40" />
          <Bar className="h-4 w-28" />
        </div>

        <div className="flex flex-col gap-3">
          <Bar className="h-4 w-24" />
          <div className={cardClass}>
            {[0, 1].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 border-b border-foreground/5 p-4 last:border-0"
              >
                <Bar className="h-4 w-32" />
                <Bar className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Bar className="h-4 w-20" />
          <div className="flex flex-col gap-3">
            {[0, 1].map((row) => (
              <div key={row} className="flex gap-3">
                <div className={`${cardClass} h-20 flex-1 animate-pulse`} />
                <div className={`${cardClass} h-20 flex-1 animate-pulse`} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Bar className="h-4 w-28" />
          <div className={cardClass}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 border-b border-foreground/5 p-4 last:border-0"
              >
                <Bar className="h-4 w-36" />
                <Bar className="h-4 w-14" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
