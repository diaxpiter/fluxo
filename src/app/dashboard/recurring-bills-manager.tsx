"use client";

import { useRef, useState, useTransition } from "react";
import {
  addRecurringBill,
  updateRecurringBill,
  deleteRecurringBill,
  payRecurringBill,
} from "@/app/dashboard/actions";
import { formatCurrency } from "@/lib/currency";
import { format } from "@/lib/i18n/format";
import {
  cardClass,
  fieldClass,
  btnPrimaryClass,
  btnGhostClass,
  btnDestructiveClass,
  linkClass,
  numericClass,
} from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { categoryDisplayName } from "@/lib/dashboard-data";
import type { Category, RecurringBill } from "@/lib/types";

export function RecurringBillsManager({
  bills,
  paidBillIds,
  categories,
  accountId,
  currency,
  locale,
  t,
}: {
  bills: RecurringBill[];
  paidBillIds: string[];
  categories: Category[];
  accountId: string;
  currency: string;
  locale: string;
  t: Dictionary;
}) {
  const [adding, setAdding] = useState(false);
  const paidSet = new Set(paidBillIds);

  const categoryName = (id: string | null) => {
    const category = categories.find((c) => c.id === id);
    return category ? categoryDisplayName(category, t.categories) : t.common.uncategorized;
  };

  return (
    <div className="flex flex-col gap-3">
      {bills.length === 0 ? (
        <p className="text-sm text-foreground/50">{t.recurringBills.empty}</p>
      ) : (
        <div className={cardClass}>
          {bills.map((bill) => (
            <BillRow
              key={bill.id}
              bill={bill}
              paid={paidSet.has(bill.id)}
              categoryName={categoryName(bill.category_id)}
              categories={categories}
              accountId={accountId}
              currency={currency}
              locale={locale}
              t={t}
            />
          ))}
        </div>
      )}

      {adding ? (
        <BillForm categories={categories} accountId={accountId} t={t} onDone={() => setAdding(false)} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={`${linkClass} self-start text-xs`}>
          {t.recurringBills.addButton}
        </button>
      )}
    </div>
  );
}

function BillRow({
  bill,
  paid,
  categoryName,
  categories,
  accountId,
  currency,
  locale,
  t,
}: {
  bill: RecurringBill;
  paid: boolean;
  categoryName: string;
  categories: Category[];
  accountId: string;
  currency: string;
  locale: string;
  t: Dictionary;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="border-b border-foreground/5 bg-foreground/[0.03] p-4 last:border-0">
        <BillForm bill={bill} categories={categories} accountId={accountId} t={t} onDone={() => setEditing(false)} />
      </div>
    );
  }

  const amount = bill.is_variable ? bill.estimated_amount ?? 0 : bill.amount ?? 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground/5 p-4 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{bill.name}</p>
        <p className="mt-0.5 truncate text-xs text-foreground/50">
          {format(t.recurringBills.dueDayBadge, { day: bill.due_day_of_month })} · {categoryName}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <p className={`text-sm ${numericClass}`}>
          {bill.is_variable ? "~" : ""}
          {formatCurrency(amount, currency, locale)}
        </p>

        <form action={updateRecurringBill} onChange={(e) => e.currentTarget.requestSubmit()}>
          <input type="hidden" name="id" value={bill.id} />
          <input type="hidden" name="name" value={bill.name} />
          <input type="hidden" name="isVariable" value={bill.is_variable ? "on" : ""} />
          <input type="hidden" name="amount" value={amount} />
          <input type="hidden" name="dueDayOfMonth" value={bill.due_day_of_month} />
          <input type="hidden" name="accountId" value={accountId} />
          <input type="hidden" name="categoryId" value={bill.category_id ?? ""} />
          <label className="flex items-center gap-1.5 text-xs text-foreground/50">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={bill.is_active}
              className="h-3.5 w-3.5 cursor-pointer rounded border-foreground/30 accent-emerald-500"
            />
            {t.recurringBills.activeLabel}
          </label>
        </form>

        <div className="flex items-center gap-3 text-xs">
          {paid ? (
            <span className="text-emerald-500">{t.recurringBills.paidThisMonth}</span>
          ) : (
            <PayButton bill={bill} accountId={accountId} t={t} />
          )}
          <button type="button" onClick={() => setEditing(true)} className={linkClass}>
            {t.common.edit}
          </button>
          <DeleteBillButton bill={bill} t={t} />
        </div>
      </div>
    </div>
  );
}

function PayButton({ bill, accountId, t }: { bill: RecurringBill; accountId: string; t: Dictionary }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
  const defaultAmount = bill.is_variable ? bill.estimated_amount ?? 0 : bill.amount ?? 0;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={linkClass}>
        {t.recurringBills.markAsPaid}
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
              <h2 className="text-lg font-semibold tracking-tight">{t.recurringBills.markAsPaid}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.addTransaction.closeLabel}
                className="cursor-pointer text-foreground/50 transition-colors hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form
              ref={formRef}
              action={(formData) => {
                startTransition(async () => {
                  await payRecurringBill(formData);
                  setOpen(false);
                });
              }}
              className="flex flex-col gap-4"
            >
              <input type="hidden" name="billId" value={bill.id} />
              <input type="hidden" name="accountId" value={accountId} />
              <input type="hidden" name="categoryId" value={bill.category_id ?? ""} />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/50">{t.addTransaction.dateLabel}</label>
                <input type="date" name="date" required defaultValue={today} className={fieldClass} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/50">{t.addTransaction.descriptionLabel}</label>
                <input type="text" name="description" required defaultValue={bill.name} className={fieldClass} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/50">{t.recurringBills.amountLabel}</label>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={defaultAmount}
                  className={fieldClass}
                />
              </div>

              <button type="submit" disabled={isPending} className={`${btnDestructiveClass} mt-1`}>
                {t.recurringBills.markAsPaid}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function DeleteBillButton({ bill, t }: { bill: RecurringBill; t: Dictionary }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${linkClass} hover:text-red-400`}>
        {t.common.delete}
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
            <h2 className="text-lg font-semibold tracking-tight">{t.recurringBills.deleteTitle}</h2>
            <p className="mt-2 text-sm text-foreground/60">
              {format(t.recurringBills.deleteBody, { name: bill.name })}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setOpen(false)} className={btnGhostClass}>
                {t.common.cancel}
              </button>
              <form action={deleteRecurringBill}>
                <input type="hidden" name="id" value={bill.id} />
                <button type="submit" className={`${btnDestructiveClass} w-full`}>
                  {t.common.delete}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BillForm({
  bill,
  categories,
  accountId,
  t,
  onDone,
}: {
  bill?: RecurringBill;
  categories: Category[];
  accountId: string;
  t: Dictionary;
  onDone: () => void;
}) {
  const [isVariable, setIsVariable] = useState(bill?.is_variable ?? false);
  const action = bill ? updateRecurringBill : addRecurringBill;

  return (
    <form
      action={async (formData) => {
        await action(formData);
        onDone();
      }}
      className={`${cardClass} flex flex-col gap-3 p-4`}
    >
      {bill && <input type="hidden" name="id" value={bill.id} />}
      <input type="hidden" name="accountId" value={accountId} />

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-foreground/50">{t.recurringBills.nameLabel}</label>
        <input type="text" name="name" required autoFocus defaultValue={bill?.name} className={fieldClass} />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-foreground/50">
            {isVariable ? t.recurringBills.estimatedAmountLabel : t.recurringBills.amountLabel}
          </label>
          <input
            type="number"
            name="amount"
            step="0.01"
            min="0"
            required
            defaultValue={bill ? (bill.is_variable ? bill.estimated_amount ?? undefined : bill.amount ?? undefined) : undefined}
            className={`${fieldClass} w-28`}
          />
        </div>

        <label className="flex items-center gap-1.5 pb-2 text-xs text-foreground/50">
          <input
            type="checkbox"
            name="isVariable"
            checked={isVariable}
            onChange={(e) => setIsVariable(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer rounded border-foreground/30 accent-emerald-500"
          />
          {t.recurringBills.variableAmountLabel}
        </label>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-foreground/50">{t.recurringBills.dueDayLabel}</label>
          <input
            type="number"
            name="dueDayOfMonth"
            min={1}
            max={31}
            required
            defaultValue={bill?.due_day_of_month ?? 1}
            className={`${fieldClass} w-20`}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-foreground/50">{t.addTransaction.categoryLabel}</label>
          <select name="categoryId" defaultValue={bill?.category_id ?? ""} className={fieldClass}>
            <option value="">{t.common.uncategorized}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryDisplayName(c, t.categories)}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-1.5 pb-2 text-xs text-foreground/50">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={bill?.is_active ?? true}
            className="h-3.5 w-3.5 cursor-pointer rounded border-foreground/30 accent-emerald-500"
          />
          {t.recurringBills.activeLabel}
        </label>
      </div>

      <div className="mt-1 flex items-center gap-4">
        <button type="submit" className={`${btnPrimaryClass} px-3 py-1.5 text-xs`}>
          {t.common.save}
        </button>
        <button type="button" onClick={onDone} className={`${linkClass} text-xs`}>
          {t.common.cancel}
        </button>
      </div>
    </form>
  );
}
