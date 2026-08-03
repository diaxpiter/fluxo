"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dictionary } from "@/lib/i18n/dictionary";

export function BottomNav({ t }: { t: Dictionary["nav"] }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/dashboard", label: t.home },
    { href: "/dashboard/history", label: t.history },
    { href: "/dashboard/settings", label: t.settings },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-foreground/10 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-3xl items-stretch justify-around px-4 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const active = tab.href === "/dashboard" ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 py-3 text-center text-sm transition-colors duration-150 ${
                active ? "font-medium text-foreground" : "text-foreground/50 hover:text-foreground/80"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
