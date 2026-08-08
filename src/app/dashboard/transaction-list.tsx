"use client";

import { useState } from "react";
import { updateTransaction, deleteTransaction } from "@/app/dashboard/actions";
import { useSelection } from "@/app/dashboard/history/selection";
import { CategorySelect } from "@/app/dashboard/category-select";
import { formatCurrency } from "@/lib/currency";
import { cardClass, fieldClass, btnPrimaryClass, btnGhostClass, btnDestructiveClass, linkClass, actionLinkClass, numericClass } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { format } from "@/lib/i18n/format";
import { categoryDisplayName } from "@/lib/dashboard-data";
import { notify } from "@/lib/toast";
import type { Category } from "@/lib/types";

type Row = {
  id: string;
  date: string;
  description: string;
  category_id: string | null;
  amount: number;
  balance: number;
  transfer_group_id?: string | null;
  recurring_bill_id?: string | null;
  income_source_id?: string | null;
};

// A fixed-width magnitude column keeps the +/- sign at the same x position on every row --
// plain right-aligned "sign + amount" text lets the sign drift left/right per row depending on
// how many digits the amount has.
function SignedAmount({ amount, currency, locale }: { amount: number; currency: string; locale: string }) {
  const negative = amount < 0;
  return (
    <span className={`inline-flex items-baseline justify-end gap-1 ${negative ? "text-red-400" : "text-emerald-500"}`}>
      <span>{negative ? "−" : "+"}</span>
      <span className="inline-block min-w-[10ch] text-right">
        {formatCurrency(Math.abs(amount), currency, locale)}
      </span>
    </span>
  );
}

export function TransactionList({
  rows,
  categories,
  currency,
  locale,
  t,
  common,
  categoryLabels,
  addCategoryT,
}: {
  rows: Row[];
  categories: Category[];
  currency: string;
  locale: string;
  t: Dictionary["transactionList"];
  common: Dictionary["common"];
  categoryLabels: Dictionary["categories"];
  addCategoryT: Dictionary["addCategory"];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const { active: selecting, selectedIds, toggle: toggleSelected } = useSelection();
  // Editing and bulk-selecting a row at the same time isn't a state the UI supports -- entering
  // selection mode mid-edit closes the open edit form instead of leaving it stranded.
  const openEditId = selecting ? null : editingId;

  const categoryName = (id: string | null) => {
    const category = categories.find((c) => c.id === id);
    return category ? categoryDisplayName(category, categoryLabels) : common.uncategorized;
  };

  if (rows.length === 0) {
    return <div className={`${cardClass} p-6 text-center text-sm text-foreground/50`}>{t.empty}</div>;
  }

  const newestFirst = [...rows].reverse();

  return (
    <div className={cardClass}>
      {/* Phones: stacked cards, nothing hidden off-screen */}
      <div className="flex flex-col sm:hidden">
        {newestFirst.map((row) =>
          openEditId === row.id ? (
            <div key={row.id} className="border-b border-foreground/5 bg-foreground/[0.03] p-4 last:border-0">
              <EditForm
                row={row}
                categories={categories}
                t={t}
                common={common}
                categoryLabels={categoryLabels}
                addCategoryT={addCategoryT}
                onDone={() => setEditingId(null)}
              />
            </div>
          ) : (
            <div key={row.id} className="flex items-start gap-3 border-b border-foreground/5 p-4 last:border-0">
              {selecting && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(row.id)}
                  onChange={() => toggleSelected(row.id)}
                  aria-label={row.description}
                  className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-emerald-500"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.description}</p>
                    <p className="mt-0.5 truncate text-xs text-foreground/50">
                      {row.date} · {categoryName(row.category_id)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-sm ${numericClass}`}>
                      <SignedAmount amount={row.amount} currency={currency} locale={locale} />
                    </p>
                    <p className={`mt-0.5 text-xs text-foreground/50 ${numericClass}`}>
                      {formatCurrency(row.balance, currency, locale)}
                    </p>
                  </div>
                </div>
                {!selecting && (
                  <div className="mt-2 flex items-center gap-4">
                    {!row.transfer_group_id && !row.recurring_bill_id && !row.income_source_id && (
                      <button
                        type="button"
                        onClick={() => setEditingId(row.id)}
                        className={`${actionLinkClass} text-xs`}
                      >
                        {common.edit}
                      </button>
                    )}
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
                )}
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
              {selecting && <th className="w-8 px-4 py-2.5" />}
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
              openEditId === row.id ? (
                <tr key={row.id} className="border-b border-foreground/5 bg-foreground/[0.03] last:border-0">
                  <td colSpan={6} className="px-4 py-3">
                    <EditForm
                row={row}
                categories={categories}
                t={t}
                common={common}
                categoryLabels={categoryLabels}
                addCategoryT={addCategoryT}
                onDone={() => setEditingId(null)}
              />
                  </td>
                </tr>
              ) : (
                <tr
                  key={row.id}
                  className="border-b border-foreground/5 transition-colors last:border-0 hover:bg-foreground/[0.02]"
                >
                  {selecting && (
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleSelected(row.id)}
                        aria-label={row.description}
                        className="h-4 w-4 cursor-pointer accent-emerald-500"
                      />
                    </td>
                  )}
                  <td className="whitespace-nowrap px-4 py-2.5 text-foreground/50">{row.date}</td>
                  <td className="px-4 py-2.5">{row.description}</td>
                  <td className="px-4 py-2.5 text-foreground/50">{categoryName(row.category_id)}</td>
                  <td className={`px-4 py-2.5 text-right ${numericClass}`}>
                    <SignedAmount amount={row.amount} currency={currency} locale={locale} />
                  </td>
                  <td className={`px-4 py-2.5 text-right font-medium ${numericClass}`}>
                    {formatCurrency(row.balance, currency, locale)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {!selecting && (
                      <div className="flex items-center justify-end gap-3">
                        {!row.transfer_group_id && !row.recurring_bill_id && !row.income_source_id && (
                          <button
                            type="button"
                            onClick={() => setEditingId(row.id)}
                            className={`${linkClass} text-xs`}
                          >
                            {common.edit}
                          </button>
                        )}
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
                    )}
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
        className={`${actionLinkClass} text-xs hover:text-red-400`}
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
              <form
                action={async (formData) => {
                  const result = await deleteTransaction(formData);
                  notify(result.ok ? common.deletedToast : result.error, result.ok ? "success" : "error");
                }}
              >
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
  categoryLabels,
  addCategoryT,
  onDone,
}: {
  row: Row;
  categories: Category[];
  t: Dictionary["transactionList"];
  common: Dictionary["common"];
  categoryLabels: Dictionary["categories"];
  addCategoryT: Dictionary["addCategory"];
  onDone: () => void;
}) {
  return (
    <form
      action={async (formData) => {
        const result = await updateTransaction(formData);
        if (result.ok) {
          notify(common.savedToast);
          onDone();
        } else {
          notify(result.error, "error");
        }
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
        <CategorySelect
          categories={categories}
          defaultValue={row.category_id}
          categoryLabels={categoryLabels}
          addCategoryT={addCategoryT}
          common={common}
          className={`${fieldClass} py-1`}
        />
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
