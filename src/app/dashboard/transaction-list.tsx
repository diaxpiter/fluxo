"use client";

import { useState } from "react";
import { updateTransaction, deleteTransaction } from "@/app/dashboard/actions";
import { formatCurrency } from "@/lib/currency";
import { cardClass, fieldClass, btnPrimaryClass, btnGhostClass, btnDestructiveClass, linkClass, numericClass } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { format } from "@/lib/i18n/format";
import type { Category } from "@/lib/types";

type Row = {
  id: string;
  date: string;
  description: string;
  category_id: string | null;
  amount: number;
  balance: number;
};

export function TransactionList({
  rows,
  categories,
  currency,
  locale,
  t,
  common,
}: {
  rows: Row[];
  categories: Category[];
  currency: string;
  locale: string;
  t: Dictionary["transactionList"];
  common: Dictionary["common"];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? common.uncategorized;

  if (rows.length === 0) {
    return <div className={`${cardClass} p-6 text-center text-sm text-foreground/50`}>{t.empty}</div>;
  }

  const newestFirst = [...rows].reverse();

  return (
    <div className={cardClass}>
      {/* Phones: stacked cards, nothing hidden off-screen */}
      <div className="flex flex-col sm:hidden">
        {newestFirst.map((row) =>
          editingId === row.id ? (
            <div key={row.id} className="border-b border-foreground/5 bg-foreground/[0.03] p-4 last:border-0">
              <EditForm row={row} categories={categories} t={t} common={common} onDone={() => setEditingId(null)} />
            </div>
          ) : (
            <div key={row.id} className="border-b border-foreground/5 p-4 last:border-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.description}</p>
                  <p className="mt-0.5 truncate text-xs text-foreground/50">
                    {row.date} · {categoryName(row.category_id)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm ${numericClass} ${row.amount < 0 ? "text-red-400" : "text-emerald-500"}`}>
                    {row.amount >= 0 ? "+" : ""}
                    {formatCurrency(row.amount, currency, locale)}
                  </p>
                  <p className={`mt-0.5 text-xs text-foreground/50 ${numericClass}`}>
                    {formatCurrency(row.balance, currency, locale)}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-4">
                <button type="button" onClick={() => setEditingId(row.id)} className={`${linkClass} text-xs`}>
                  {common.edit}
                </button>
                <DeleteButton
                  id={row.id}
                  description={row.description}
                  amount={row.amount}
                  currency={currency}
                  locale={locale}
                  t={t}
                  common={common}
                />
              </div>
            </div>
          ),
        )}
      </div>

      {/* Tablet and up: full table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 bg-foreground/[0.03] text-left text-xs font-medium text-foreground/50">
              <th className="px-4 py-2.5 font-medium">{t.date}</th>
              <th className="px-4 py-2.5 font-medium">{t.description}</th>
              <th className="px-4 py-2.5 font-medium">{t.category}</th>
              <th className="px-4 py-2.5 text-right font-medium">{t.amount}</th>
              <th className="px-4 py-2.5 text-right font-medium">{t.balance}</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {newestFirst.map((row) =>
              editingId === row.id ? (
                <tr key={row.id} className="border-b border-foreground/5 bg-foreground/[0.03] last:border-0">
                  <td colSpan={6} className="px-4 py-3">
                    <EditForm row={row} categories={categories} t={t} common={common} onDone={() => setEditingId(null)} />
                  </td>
                </tr>
              ) : (
                <tr
                  key={row.id}
                  className="border-b border-foreground/5 transition-colors last:border-0 hover:bg-foreground/[0.02]"
                >
                  <td className="whitespace-nowrap px-4 py-2.5 text-foreground/50">{row.date}</td>
                  <td className="px-4 py-2.5">{row.description}</td>
                  <td className="px-4 py-2.5 text-foreground/50">{categoryName(row.category_id)}</td>
                  <td
                    className={`px-4 py-2.5 text-right ${numericClass} ${
                      row.amount < 0 ? "text-red-400" : "text-emerald-500"
                    }`}
                  >
                    {row.amount >= 0 ? "+" : ""}
                    {formatCurrency(row.amount, currency, locale)}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-medium ${numericClass}`}>
                    {formatCurrency(row.balance, currency, locale)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button type="button" onClick={() => setEditingId(row.id)} className={`${linkClass} text-xs`}>
                        {common.edit}
                      </button>
                      <DeleteButton
                        id={row.id}
                        description={row.description}
                        amount={row.amount}
                        currency={currency}
                        locale={locale}
                        t={t}
                        common={common}
                      />
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeleteButton({
  id,
  description,
  amount,
  currency,
  locale,
  t,
  common,
}: {
  id: string;
  description: string;
  amount: number;
  currency: string;
  locale: string;
  t: Dictionary["transactionList"];
  common: Dictionary["common"];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${linkClass} text-xs hover:text-red-400`}
      >
        {common.delete}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="animate-modal-in w-full max-w-sm rounded-2xl border border-foreground/10 bg-background p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold tracking-tight">{t.deleteTitle}</h2>
            <p className="mt-2 text-sm text-foreground/60">
              {format(t.deleteBody, { description, amount: formatCurrency(amount, currency, locale) })}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setOpen(false)} className={btnGhostClass}>
                {common.cancel}
              </button>
              <form action={deleteTransaction}>
                <input type="hidden" name="id" value={id} />
                <button type="submit" className={`${btnDestructiveClass} w-full`}>
                  {common.delete}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EditForm({
  row,
  categories,
  t,
  common,
  onDone,
}: {
  row: Row;
  categories: Category[];
  t: Dictionary["transactionList"];
  common: Dictionary["common"];
  onDone: () => void;
}) {
  return (
    <form
      action={async (formData) => {
        await updateTransaction(formData);
        onDone();
      }}
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <input type="hidden" name="id" value={row.id} />

      <div className="flex flex-col gap-1">
        <label className="text-xs text-foreground/50">{t.date}</label>
        <input type="date" name="date" defaultValue={row.date} required className={`${fieldClass} py-1`} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-foreground/50">{t.description}</label>
        <input
          type="text"
          name="description"
          defaultValue={row.description}
          required
          className={`${fieldClass} py-1`}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-foreground/50">{t.category}</label>
        <select name="categoryId" defaultValue={row.category_id ?? ""} className={`${fieldClass} py-1`}>
          <option value="">{common.uncategorized}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-foreground/50">{t.type}</label>
        <select name="direction" defaultValue={row.amount < 0 ? "out" : "in"} className={`${fieldClass} py-1`}>
          <option value="out">{t.moneyOut}</option>
          <option value="in">{t.moneyIn}</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-foreground/50">{t.amount}</label>
        <input
          type="number"
          name="amount"
          step="0.01"
          min="0"
          defaultValue={Math.abs(row.amount)}
          required
          className={`${fieldClass} w-full py-1 sm:w-24`}
        />
      </div>

      <div className="flex gap-4 sm:contents">
        <button type="submit" className={`${btnPrimaryClass} px-3 py-1.5 text-xs`}>
          {common.save}
        </button>
        <button type="button" onClick={onDone} className={`${linkClass} text-xs`}>
          {common.cancel}
        </button>
      </div>
    </form>
  );
}
