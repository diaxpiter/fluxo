import { cardClass } from "@/lib/ui";

function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-foreground/10 ${className}`} />;
}

export default function Loading() {
  return (
    <main className="flex flex-1 flex-col px-4 pb-24 pt-[calc(env(safe-area-inset-top)+2rem)] sm:pt-12 sm:pb-24">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Bar className="h-6 w-24" />
          <Bar className="h-8 w-28 rounded-lg" />
        </div>

        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${cardClass} flex items-center justify-between gap-3 p-4`}>
              <Bar className="h-4 w-28" />
              <Bar className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
