"use client";

import { useRef, useState, useTransition } from "react";
import {
  addRecurringBill,
  updateRecurringBill,
  deleteRecurringBill,
  payRecurringBill,
} from "@/app/dashboard/actions";
import { CategorySelect } from "@/app/dashboard/category-select";
import { formatCurrency } from "@/lib/currency";
import { format } from "@/lib/i18n/format";
import {
  cardClass,
  fieldClass,
  btnPrimaryClass,
  btnGhostClass,
  btnDestructiveClass,
  linkClass,
  actionLinkClass,
  numericClass,
} from "@/lib/ui";
import { notify } from "@/lib/toast";
import { billOccurrencesInMonth, remainingBillOccurrences } from "@/lib/widgets";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { accountDisplayName, categoryDisplayName } from "@/lib/dashboard-data";
import type { Account, BillRecurrenceType, Category, RecurringBill } from "@/lib/types";

function weekdayNames(locale: string) {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "long" });
  // Jan 7 2024 was a Sunday, matching JS's getDay() convention (0 = Sunday).
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 7 + i)));
}

function monthNames(locale: string) {
  const fmt = new Intl.DateTimeFormat(locale, { month: "long" });
  return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(2024, i, 1)));
}

export function RecurringBillsManager({
  bills,
  paidBillOccurrences,
  categories,
  accounts,
  currency,
  locale,
  t,
}: {
  bills: RecurringBill[];
  paidBillOccurrences: { recurring_bill_id: string; date: string }[];
  categories: Category[];
  accounts: Account[];
  currency: string;
  locale: string;
  t: Dictionary;
}) {
  const [adding, setAdding] = useState(false);

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
          {bills.map((bill) => {
            const totalThisMonth = billOccurrencesInMonth(bill).length;
            const paidForBill = paidBillOccurrences.filter((o) => o.recurring_bill_id === bill.id);
            const paidCount = totalThisMonth - remainingBillOccurrences(bill, paidForBill).length;
            return (
              <BillRow
                key={bill.id}
                bill={bill}
                totalThisMonth={totalThisMonth}
                paidCount={paidCount}
                categoryName={categoryName(bill.category_id)}
                categories={categories}
                accounts={accounts}
                currency={currency}
                locale={locale}
                t={t}
              />
            );
          })}
        </div>
      )}

      {adding ? (
        <BillForm categories={categories} accounts={accounts} locale={locale} t={t} onDone={() => setAdding(false)} />
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
  totalThisMonth,
  paidCount,
  categoryName,
  categories,
  accounts,
  currency,
  locale,
  t,
}: {
  bill: RecurringBill;
  totalThisMonth: number;
  paidCount: number;
  categoryName: string;
  categories: Category[];
  accounts: Account[];
  currency: string;
  locale: string;
  t: Dictionary;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="border-b border-foreground/5 bg-foreground/[0.03] p-4 last:border-0">
        <BillForm
          bill={bill}
          categories={categories}
          accounts={accounts}
          locale={locale}
          t={t}
          onDone={() => setEditing(false)}
        />
      </div>
    );
  }

  const amount = bill.is_variable ? bill.estimated_amount ?? 0 : bill.amount ?? 0;
  const account = accounts.find((a) => a.id === bill.account_id);
  const accountName = account ? accountDisplayName(account, t.common.mainAccount) : "";
  const remaining = totalThisMonth - paidCount;
  const fullyPaid = totalThisMonth > 0 && remaining <= 0;

  const badgeText =
    bill.recurrence_type === "weekly"
      ? format(t.recurringBills.dueWeeklyBadge, { day: weekdayNames(locale)[bill.due_day_of_week ?? 0] })
      : bill.recurrence_type === "biweekly"
        ? format(t.recurringBills.dueBiweeklyBadge, { day: weekdayNames(locale)[bill.due_day_of_week ?? 0] })
        : bill.recurrence_type === "yearly"
          ? format(t.recurringBills.dueYearlyBadge, {
              month: monthNames(locale)[(bill.due_month ?? 1) - 1],
              day: bill.due_day_of_month ?? 1,
            })
          : format(t.recurringBills.dueDayBadge, { day: bill.due_day_of_month ?? 1 });

  return (
    <div className="border-b border-foreground/5 p-4 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{bill.name}</p>
          <p className="mt-0.5 truncate text-xs text-foreground/50">
            {badgeText} · {categoryName} · {accountName}
          </p>
        </div>
        <p className={`shrink-0 text-sm ${numericClass}`}>
          {bill.is_variable ? "~" : ""}
          {formatCurrency(amount, currency, locale)}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <form
          action={async (formData) => {
            const result = await updateRecurringBill(formData);
            notify(result.ok ? t.common.savedToast : result.error, result.ok ? "success" : "error");
          }}
          onChange={(e) => e.currentTarget.requestSubmit()}
        >
          <input type="hidden" name="id" value={bill.id} />
          <input type="hidden" name="name" value={bill.name} />
          <input type="hidden" name="isVariable" value={bill.is_variable ? "on" : ""} />
          <input type="hidden" name="amount" value={amount} />
          <input type="hidden" name="recurrenceType" value={bill.recurrence_type} />
          <input type="hidden" name="dueDayOfMonth" value={bill.due_day_of_month ?? ""} />
          <input type="hidden" name="dueDayOfWeek" value={bill.due_day_of_week ?? ""} />
          <input type="hidden" name="dueMonth" value={bill.due_month ?? ""} />
          <input type="hidden" name="anchorDate" value={bill.anchor_date ?? ""} />
          <input type="hidden" name="accountId" value={bill.account_id} />
          <input type="hidden" name="categoryId" value={bill.category_id ?? ""} />
          <label className="flex items-center gap-1.5 text-foreground/50">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={bill.is_active}
              className="h-3.5 w-3.5 cursor-pointer rounded border-foreground/30 accent-emerald-500"
            />
            {t.recurringBills.activeLabel}
          </label>
        </form>

        {totalThisMonth > 1 ? (
          <span className={fullyPaid ? "text-emerald-500" : "text-foreground/50"}>
            {format(t.recurringBills.paidCountBadge, { paid: paidCount, total: totalThisMonth })}
          </span>
        ) : (
          fullyPaid && <span className="text-emerald-500">{t.recurringBills.paidThisMonth}</span>
        )}
        {totalThisMonth > 0 && !fullyPaid && <PayButton bill={bill} t={t} />}

        <button type="button" onClick={() => setEditing(true)} className={actionLinkClass}>
          {t.common.edit}
        </button>
        <DeleteBillButton bill={bill} t={t} />
      </div>
    </div>
  );
}

function PayButton({ bill, t }: { bill: RecurringBill; t: Dictionary }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
  const defaultAmount = bill.is_variable ? bill.estimated_amount ?? 0 : bill.amount ?? 0;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={actionLinkClass}>
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
                  const result = await payRecurringBill(formData);
                  if (result.ok) {
                    notify(t.common.savedToast);
                    setOpen(false);
                  } else {
                    notify(result.error, "error");
                  }
                });
              }}
              className="flex flex-col gap-4"
            >
              <input type="hidden" name="billId" value={bill.id} />
              <input type="hidden" name="accountId" value={bill.account_id} />
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
      <button type="button" onClick={() => setOpen(true)} className={`${actionLinkClass} hover:text-red-400`}>
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
              <form
                action={async (formData) => {
                  const result = await deleteRecurringBill(formData);
                  notify(result.ok ? t.common.deletedToast : result.error, result.ok ? "success" : "error");
                }}
              >
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
  accounts,
  locale,
  t,
  onDone,
}: {
  bill?: RecurringBill;
  categories: Category[];
  accounts: Account[];
  locale: string;
  t: Dictionary;
  onDone: () => void;
}) {
  const [isVariable, setIsVariable] = useState(bill?.is_variable ?? false);
  const [recurrenceType, setRecurrenceType] = useState<BillRecurrenceType>(bill?.recurrence_type ?? "monthly");
  const today = new Date().toISOString().slice(0, 10);
  const action = bill ? updateRecurringBill : addRecurringBill;

  return (
    <form
      action={async (formData) => {
        const result = await action(formData);
        if (result.ok) {
          notify(t.common.savedToast);
          onDone();
        } else {
          notify(result.error, "error");
        }
      }}
      className={`${cardClass} flex flex-col gap-4 p-4`}
    >
      {bill && <input type="hidden" name="id" value={bill.id} />}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-foreground/50">{t.recurringBills.nameLabel}</label>
        <input type="text" name="name" required autoFocus defaultValue={bill?.name} className={fieldClass} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
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
            className={fieldClass}
          />
        </div>

        <label className="flex items-center gap-1.5 pb-2 text-xs whitespace-nowrap text-foreground/50 sm:self-end">
          <input
            type="checkbox"
            name="isVariable"
            checked={isVariable}
            onChange={(e) => setIsVariable(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer rounded border-foreground/30 accent-emerald-500"
          />
          {t.recurringBills.variableAmountLabel}
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-foreground/50">{t.recurringBills.frequencyLabel}</label>
          <select
            name="recurrenceType"
            value={recurrenceType}
            onChange={(e) => setRecurrenceType(e.target.value as BillRecurrenceType)}
            className={fieldClass}
          >
            <option value="monthly">{t.recurringBills.monthlyLabel}</option>
            <option value="weekly">{t.recurringBills.weeklyLabel}</option>
            <option value="biweekly">{t.recurringBills.biweeklyLabel}</option>
            <option value="yearly">{t.recurringBills.yearlyLabel}</option>
          </select>
        </div>

        {recurrenceType === "monthly" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-foreground/50">{t.recurringBills.dueDayLabel}</label>
            <input
              type="number"
              name="dueDayOfMonth"
              min={1}
              max={31}
              required
              defaultValue={bill?.due_day_of_month ?? 1}
              className={fieldClass}
            />
          </div>
        )}

        {(recurrenceType === "weekly" || recurrenceType === "biweekly") && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-foreground/50">{t.recurringBills.dayOfWeekLabel}</label>
            <select name="dueDayOfWeek" defaultValue={bill?.due_day_of_week ?? 1} className={fieldClass}>
              {weekdayNames(locale).map((name, i) => (
                <option key={i} value={i}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}

        {recurrenceType === "yearly" && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-foreground/50">{t.recurringBills.monthLabel}</label>
              <select name="dueMonth" defaultValue={bill?.due_month ?? 1} className={fieldClass}>
                {monthNames(locale).map((name, i) => (
                  <option key={i} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-foreground/50">{t.recurringBills.dueDayLabel}</label>
              <input
                type="number"
                name="dueDayOfMonth"
                min={1}
                max={31}
                required
                defaultValue={bill?.due_day_of_month ?? 1}
                className={fieldClass}
              />
            </div>
          </>
        )}

        {recurrenceType === "biweekly" && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs text-foreground/50">{t.recurringBills.startingFromLabel}</label>
            <input type="date" name="anchorDate" required defaultValue={bill?.anchor_date ?? today} className={fieldClass} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-foreground/50">{t.common.account}</label>
          <select name="accountId" defaultValue={bill?.account_id ?? accounts[0]?.id} className={fieldClass}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {accountDisplayName(a, t.common.mainAccount)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-foreground/50">{t.addTransaction.categoryLabel}</label>
          <CategorySelect
            categories={categories}
            defaultValue={bill?.category_id}
            categoryLabels={t.categories}
            addCategoryT={t.addCategory}
            common={t.common}
          />
        </div>
      </div>

      <label className="flex items-center gap-1.5 text-xs text-foreground/50">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={bill?.is_active ?? true}
          className="h-3.5 w-3.5 cursor-pointer rounded border-foreground/30 accent-emerald-500"
        />
        {t.recurringBills.activeLabel}
      </label>

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
