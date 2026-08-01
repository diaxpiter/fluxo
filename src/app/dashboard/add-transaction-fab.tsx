"use client";

import { useRef, useState, useTransition } from "react";
import { addTransaction } from "@/app/dashboard/actions";
import { AddCategoryInline } from "@/app/dashboard/add-category-inline";
import type { Category } from "@/lib/types";

export function AddTransactionFab({
  accountId,
  categories,
}: {
  accountId: string;
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add transaction"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-2xl font-light text-background shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        +
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-foreground/10 bg-background p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Add transaction</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-foreground/60 hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form
              ref={formRef}
              action={(formData) => {
                startTransition(async () => {
                  await addTransaction(formData);
                  formRef.current?.reset();
                  setOpen(false);
                });
              }}
              className="flex flex-col gap-4"
            >
              <input type="hidden" name="accountId" value={accountId} />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/60">Date</label>
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={today}
                  className="rounded-md border border-foreground/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/60">Description</label>
                <input
                  type="text"
                  name="description"
                  required
                  autoFocus
                  placeholder="Rent, salary, coffee…"
                  className="rounded-md border border-foreground/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/60">Category</label>
                <select
                  name="categoryId"
                  defaultValue=""
                  className="rounded-md border border-foreground/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
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
                <label className="text-xs font-medium text-foreground/60">Amount</label>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  className="rounded-md border border-foreground/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
                />
              </div>

              <div className="mt-2 grid grid-cols-2 gap-3">
                <button
                  type="submit"
                  name="direction"
                  value="out"
                  disabled={isPending}
                  className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                >
                  Money out
                </button>
                <button
                  type="submit"
                  name="direction"
                  value="in"
                  disabled={isPending}
                  className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm font-medium text-emerald-500 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  Money in
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
