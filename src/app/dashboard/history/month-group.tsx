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
  addCategoryT,
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
  addCategoryT: Dictionary["addCategory"];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${cardClass} flex w-full flex-col gap-2 p-4 text-left transition-colors duration-150 hover:bg-foreground/[0.06] sm:grid sm:grid-cols-[1fr_6rem_6rem_6rem] sm:items-center sm:gap-3`}
      >
        <span className="truncate text-sm font-medium">{label}</span>
        <div className="flex items-center justify-between gap-3 sm:contents">
          <span className={`text-xs text-emerald-500 sm:whitespace-nowrap sm:text-right ${numericClass}`}>
            +{formatCurrency(moneyIn, currency, locale)}
          </span>
          <span className={`text-xs text-red-400 sm:whitespace-nowrap sm:text-right ${numericClass}`}>
            -{formatCurrency(moneyOut, currency, locale)}
          </span>
          <span className={`text-xs font-medium text-foreground sm:whitespace-nowrap sm:text-right ${numericClass}`}>
            {formatCurrency(finalBalance, currency, locale)}
          </span>
        </div>
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
            addCategoryT={addCategoryT}
          />
        </div>
      )}
    </div>
  );
}
