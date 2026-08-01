"use client";

import { useState } from "react";
import { updateTransaction, deleteTransaction } from "@/app/dashboard/actions";
import { formatCurrency } from "@/lib/currency";
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
      <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-6 text-center text-sm text-foreground/60">
        No transactions yet — add your first one above.
      </div>
    );
  }

  const newestFirst = [...rows].reverse();

  return (
    <div className="overflow-x-auto rounded-xl border border-foreground/10">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-foreground/10 bg-foreground/[0.03] text-left text-xs font-medium text-foreground/60">
            <th className="px-4 py-2 font-medium">Date</th>
            <th className="px-4 py-2 font-medium">Description</th>
            <th className="px-4 py-2 font-medium">Category</th>
            <th className="px-4 py-2 text-right font-medium">Amount</th>
            <th className="px-4 py-2 text-right font-medium">Balance</th>
            <th className="px-4 py-2" />
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
              <tr key={row.id} className="border-b border-foreground/5 last:border-0">
                <td className="whitespace-nowrap px-4 py-2 text-foreground/60">{row.date}</td>
                <td className="px-4 py-2">{row.description}</td>
                <td className="px-4 py-2 text-foreground/60">{categoryName(row.category_id)}</td>
                <td
                  className={`px-4 py-2 text-right tabular-nums ${
                    row.amount < 0 ? "text-red-500" : "text-emerald-500"
                  }`}
                >
                  {row.amount >= 0 ? "+" : ""}
                  {formatCurrency(row.amount, currency)}
                </td>
                <td className="px-4 py-2 text-right font-medium tabular-nums">
                  {formatCurrency(row.balance, currency)}
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingId(row.id)}
                      className="text-xs text-foreground/60 underline underline-offset-4 hover:text-foreground"
                    >
                      Edit
                    </button>
                    <form action={deleteTransaction}>
                      <input type="hidden" name="id" value={row.id} />
                      <button
                        type="submit"
                        className="text-xs text-foreground/60 underline underline-offset-4 hover:text-red-500"
                      >
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
            <label className="text-xs text-foreground/60">Date</label>
            <input
              type="date"
              name="date"
              defaultValue={row.date}
              required
              className="rounded-md border border-foreground/15 bg-transparent px-2 py-1 text-sm outline-none focus:border-foreground/40"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-foreground/60">Description</label>
            <input
              type="text"
              name="description"
              defaultValue={row.description}
              required
              className="rounded-md border border-foreground/15 bg-transparent px-2 py-1 text-sm outline-none focus:border-foreground/40"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-foreground/60">Category</label>
            <select
              name="categoryId"
              defaultValue={row.category_id ?? ""}
              className="rounded-md border border-foreground/15 bg-transparent px-2 py-1 text-sm outline-none focus:border-foreground/40"
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-foreground/60">Type</label>
            <select
              name="direction"
              defaultValue={row.amount < 0 ? "out" : "in"}
              className="rounded-md border border-foreground/15 bg-transparent px-2 py-1 text-sm outline-none focus:border-foreground/40"
            >
              <option value="out">Money out</option>
              <option value="in">Money in</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-foreground/60">Amount</label>
            <input
              type="number"
              name="amount"
              step="0.01"
              min="0"
              defaultValue={Math.abs(row.amount)}
              required
              className="w-24 rounded-md border border-foreground/15 bg-transparent px-2 py-1 text-sm outline-none focus:border-foreground/40"
            />
          </div>

          <button
            type="submit"
            className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background"
          >
            Save
          </button>
          <button type="button" onClick={onDone} className="text-xs text-foreground/60">
            Cancel
          </button>
        </form>
      </td>
    </tr>
  );
}
