"use client";

import { useState } from "react";
import { TransactionList } from "@/app/dashboard/transaction-list";
import { formatCurrency } from "@/lib/currency";
import { cardClass, numericClass } from "@/lib/ui";
import type { LedgerRow } from "@/lib/dashboard-data";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Category } from "@/lib/types";

export function MonthGroup({
  label,
  rows,
  moneyIn,
  moneyOut,
  finalBalance,
  categories,
  currency,
  locale,
  t,
  common,
  categoryLabels,
  defaultOpen = false,
}: {
  label: string;
  rows: LedgerRow[];
  moneyIn: number;
  moneyOut: number;
  finalBalance: number;
  categories: Category[];
  currency: string;
  locale: string;
  t: Dictionary["transactionList"];
  common: Dictionary["common"];
  categoryLabels: Dictionary["categories"];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${cardClass} flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left transition-colors duration-150 hover:bg-foreground/[0.06]`}
      >
        <span className="text-sm font-medium">{label}</span>
        <span className={`flex items-center gap-3 text-xs ${numericClass}`}>
          <span className="text-emerald-500">+{formatCurrency(moneyIn, currency, locale)}</span>
          <span className="text-red-400">-{formatCurrency(moneyOut, currency, locale)}</span>
          <span className="font-medium text-foreground">{formatCurrency(finalBalance, currency, locale)}</span>
        </span>
      </button>

      {open && (
        <div className="animate-fade-in-up">
          <TransactionList
            rows={rows}
            categories={categories}
            currency={currency}
            locale={locale}
            t={t}
            common={common}
            categoryLabels={categoryLabels}
          />
        </div>
      )}
    </div>
  );
}
