"use client";

import { useState } from "react";
import { updateTransaction, deleteTransaction } from "@/app/dashboard/actions";
import { formatCurrency } from "@/lib/currency";
import { cardClass, fieldClass, btnPrimaryClass, linkClass, numericClass } from "@/lib/ui";
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
}: {
  rows: Row[];
  categories: Category[];
  currency: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const categoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? "Uncategorized";

  if (rows.length === 0) {
    return (
      <div className={`${cardClass} p-6 text-center text-sm text-foreground/50`}>
        No transactions yet — add your first one below.
      </div>
    );
  }

  const newestFirst = [...rows].reverse();

  return (
    <div className={`${cardClass} overflow-x-auto`}>
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-foreground/10 bg-foreground/[0.03] text-left text-xs font-medium text-foreground/50">
            <th className="px-4 py-2.5 font-medium">Date</th>
            <th className="px-4 py-2.5 font-medium">Description</th>
            <th className="px-4 py-2.5 font-medium">Category</th>
            <th className="px-4 py-2.5 text-right font-medium">Amount</th>
            <th className="px-4 py-2.5 text-right font-medium">Balance</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {newestFirst.map((row) =>
            editingId === row.id ? (
              <EditRow
                key={row.id}
                row={row}
                categories={categories}
                onDone={() => setEditingId(null)}
              />
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
                  {formatCurrency(row.amount, currency)}
                </td>
                <td className={`px-4 py-2.5 text-right font-medium ${numericClass}`}>
                  {formatCurrency(row.balance, currency)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => setEditingId(row.id)} className={`${linkClass} text-xs`}>
                      Edit
                    </button>
                    <form action={deleteTransaction}>
                      <input type="hidden" name="id" value={row.id} />
                      <button type="submit" className={`${linkClass} text-xs hover:text-red-400`}>
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

function EditRow({
  row,
  categories,
  onDone,
}: {
  row: Row;
  categories: Category[];
  onDone: () => void;
}) {
  return (
    <tr className="border-b border-foreground/5 bg-foreground/[0.03] last:border-0">
      <td colSpan={6} className="px-4 py-3">
        <form
          action={async (formData) => {
            await updateTransaction(formData);
            onDone();
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="id" value={row.id} />

          <div className="flex flex-col gap-1">
            <label className="text-xs text-foreground/50">Date</label>
            <input type="date" name="date" defaultValue={row.date} required className={`${fieldClass} py-1`} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-foreground/50">Description</label>
            <input
              type="text"
              name="description"
              defaultValue={row.description}
              required
              className={`${fieldClass} py-1`}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-foreground/50">Category</label>
            <select name="categoryId" defaultValue={row.category_id ?? ""} className={`${fieldClass} py-1`}>
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-foreground/50">Type</label>
            <select name="direction" defaultValue={row.amount < 0 ? "out" : "in"} className={`${fieldClass} py-1`}>
              <option value="out">Money out</option>
              <option value="in">Money in</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-foreground/50">Amount</label>
            <input
              type="number"
              name="amount"
              step="0.01"
              min="0"
              defaultValue={Math.abs(row.amount)}
              required
              className={`${fieldClass} w-24 py-1`}
            />
          </div>

          <button type="submit" className={`${btnPrimaryClass} px-3 py-1.5 text-xs`}>
            Save
          </button>
          <button type="button" onClick={onDone} className={`${linkClass} text-xs`}>
            Cancel
          </button>
        </form>
      </td>
    </tr>
  );
}
