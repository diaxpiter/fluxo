import { cardClass } from "@/lib/ui";

function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-foreground/10 ${className}`} />;
}

export default function Loading() {
  const sections = [0, 1, 2, 3, 4, 5];

  return (
    <main className="flex flex-1 flex-col px-4 pb-24 pt-[calc(env(safe-area-inset-top)+2rem)] sm:pt-12 sm:pb-24">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Bar className="h-6 w-28" />

        {sections.map((section) => (
          <div key={section} className="flex flex-col gap-3">
            <Bar className="h-4 w-32" />
            <div className={`${cardClass} p-4`}>
              <Bar className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
