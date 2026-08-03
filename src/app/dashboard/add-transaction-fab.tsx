"use client";

import { useRef, useState, useTransition } from "react";
import { addTransaction } from "@/app/dashboard/actions";
import { AddCategoryInline } from "@/app/dashboard/add-category-inline";
import { fieldClass, btnPositiveClass, btnDestructiveClass } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { categoryDisplayName } from "@/lib/dashboard-data";
import type { Category } from "@/lib/types";

export function AddTransactionFab({
  accountId,
  categories,
  t,
  addCategoryT,
  common,
  categoryLabels,
}: {
  accountId: string;
  categories: Category[];
  t: Dictionary["addTransaction"];
  addCategoryT: Dictionary["addCategory"];
  common: Dictionary["common"];
  categoryLabels: Dictionary["categories"];
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
        aria-label={t.addButtonLabel}
        className="fixed right-6 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-foreground text-2xl font-light text-background shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-transform duration-150 hover:scale-105 active:scale-95"
      >
        +
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="animate-modal-in w-full max-w-md rounded-2xl border border-foreground/10 bg-background p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">{t.heading}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.closeLabel}
                className="cursor-pointer text-foreground/50 transition-colors hover:text-foreground"
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
                <label className="text-xs font-medium text-foreground/50">{t.dateLabel}</label>
                <input type="date" name="date" required defaultValue={today} className={fieldClass} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/50">{t.descriptionLabel}</label>
                <input
                  type="text"
                  name="description"
                  required
                  autoFocus
                  placeholder={t.descriptionPlaceholder}
                  className={fieldClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/50">{t.categoryLabel}</label>
                <select name="categoryId" defaultValue="" className={fieldClass}>
                  <option value="">{common.uncategorized}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {categoryDisplayName(c, categoryLabels)}
                    </option>
                  ))}
                </select>
                <AddCategoryInline t={addCategoryT} common={common} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/50">{t.amountLabel}</label>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0"
                  required
                  placeholder={t.amountPlaceholder}
                  className={fieldClass}
                />
              </div>

              <div className="mt-2 grid grid-cols-2 gap-3">
                <button type="submit" name="direction" value="out" disabled={isPending} className={btnDestructiveClass}>
                  {t.moneyOut}
                </button>
                <button type="submit" name="direction" value="in" disabled={isPending} className={btnPositiveClass}>
                  {t.moneyIn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
