"use client";

import { useRef, useTransition } from "react";
import { addTransaction } from "@/app/dashboard/actions";
import { AddCategoryInline } from "@/app/dashboard/add-category-inline";
import type { Category } from "@/lib/types";

export function TransactionForm({
  accountId,
  categories,
}: {
  accountId: string;
  categories: Category[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await addTransaction(formData);
          formRef.current?.reset();
        });
      }}
      className="grid grid-cols-2 gap-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-6 sm:grid-cols-6"
    >
      <input type="hidden" name="accountId" value={accountId} />

      <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
        <label className="text-xs font-medium text-foreground/60">Date</label>
        <input
          type="date"
          name="date"
          required
          defaultValue={today}
          className="rounded-md border border-foreground/15 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-foreground/40"
        />
      </div>

      <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-2">
        <label className="text-xs font-medium text-foreground/60">Description</label>
        <input
          type="text"
          name="description"
          required
          placeholder="Rent, salary, coffee…"
          className="rounded-md border border-foreground/15 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-foreground/40"
        />
      </div>

      <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
        <label className="text-xs font-medium text-foreground/60">Category</label>
        <select
          name="categoryId"
          defaultValue=""
          className="rounded-md border border-foreground/15 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-foreground/40"
        >
          <option value="">Uncategorized</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <AddCategoryInline />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-foreground/60">Type</label>
        <select
          name="direction"
          defaultValue="out"
          className="rounded-md border border-foreground/15 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-foreground/40"
        >
          <option value="out">Money out</option>
          <option value="in">Money in</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-foreground/60">Amount</label>
        <input
          type="number"
          name="amount"
          step="0.01"
          min="0"
          required
          placeholder="0.00"
          className="rounded-md border border-foreground/15 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-foreground/40"
        />
      </div>

      <div className="col-span-2 flex items-end sm:col-span-6">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Adding…" : "Add transaction"}
        </button>
      </div>
    </form>
  );
}
