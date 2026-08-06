"use client";

import { useRef, useState, useTransition } from "react";
import {
  addIncomeSource,
  updateIncomeSource,
  deleteIncomeSource,
  receiveIncomeSource,
} from "@/app/dashboard/actions";
import { CategorySelect } from "@/app/dashboard/category-select";
import { formatCurrency } from "@/lib/currency";
import { format } from "@/lib/i18n/format";
import {
  cardClass,
  fieldClass,
  btnPrimaryClass,
  btnGhostClass,
  btnPositiveClass,
  btnDestructiveClass,
  linkClass,
  actionLinkClass,
  numericClass,
} from "@/lib/ui";
import { notify } from "@/lib/toast";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { accountDisplayName, categoryDisplayName } from "@/lib/dashboard-data";
import { computeAllocation } from "@/lib/allocation";
import type { Account, AllocationRule, Category, IncomeScheduleType, IncomeSource } from "@/lib/types";

export function IncomeSourcesManager({
  sources,
  receivedSourceIds,
  categories,
  accounts,
  allocationRules,
  currency,
  locale,
  t,
}: {
  sources: IncomeSource[];
  receivedSourceIds: string[];
  categories: Category[];
  accounts: Account[];
  allocationRules: AllocationRule[];
  currency: string;
  locale: string;
  t: Dictionary;
}) {
  const [adding, setAdding] = useState(false);
  const receivedSet = new Set(receivedSourceIds);

  const categoryName = (id: string | null) => {
    const category = categories.find((c) => c.id === id);
    return category ? categoryDisplayName(category, t.categories) : t.common.uncategorized;
  };

  return (
    <div className="flex flex-col gap-3">
      {sources.length === 0 ? (
        <p className="text-sm text-foreground/50">{t.incomeSources.empty}</p>
      ) : (
        <div className={cardClass}>
          {sources.map((source) => (
            <SourceRow
              key={source.id}
              source={source}
              received={source.schedule_type === "fixed_monthly_date" && receivedSet.has(source.id)}
              categoryName={categoryName(source.category_id)}
              categories={categories}
              accounts={accounts}
              allocationRules={allocationRules}
              currency={currency}
              locale={locale}
              t={t}
            />
          ))}
        </div>
      )}

      {adding ? (
        <SourceForm categories={categories} accounts={accounts} t={t} onDone={() => setAdding(false)} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={`${linkClass} self-start text-xs`}>
          {t.incomeSources.addButton}
        </button>
      )}
    </div>
  );
}

function SourceRow({
  source,
  received,
  categoryName,
  categories,
  accounts,
  allocationRules,
  currency,
  locale,
  t,
}: {
  source: IncomeSource;
  received: boolean;
  categoryName: string;
  categories: Category[];
  accounts: Account[];
  allocationRules: AllocationRule[];
  currency: string;
  locale: string;
  t: Dictionary;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="border-b border-foreground/5 bg-foreground/[0.03] p-4 last:border-0">
        <SourceForm
          source={source}
          categories={categories}
          accounts={accounts}
          t={t}
          onDone={() => setEditing(false)}
        />
      </div>
    );
  }

  const scheduleBadge =
    source.schedule_type === "fixed_monthly_date"
      ? format(t.incomeSources.dayBadge, { day: source.day_of_month ?? 1 })
      : t.incomeSources.irregularBadge;
  const account = accounts.find((a) => a.id === source.account_id);
  const accountName = account ? accountDisplayName(account, t.common.mainAccount) : "";
  const amount = source.is_variable ? source.estimated_amount : source.expected_amount;

  return (
    <div className="border-b border-foreground/5 p-4 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{source.name}</p>
          <p className="mt-0.5 truncate text-xs text-foreground/50">
            {scheduleBadge} · {categoryName} · {accountName}
          </p>
        </div>
        {amount != null && (
          <p className={`shrink-0 text-sm ${numericClass}`}>
            {source.is_variable ? "~" : ""}
            {formatCurrency(amount, currency, locale)}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <form
          action={async (formData) => {
            const result = await updateIncomeSource(formData);
            notify(result.ok ? t.common.savedToast : result.error, result.ok ? "success" : "error");
          }}
          onChange={(e) => e.currentTarget.requestSubmit()}
        >
          <input type="hidden" name="id" value={source.id} />
          <input type="hidden" name="name" value={source.name} />
          <input type="hidden" name="scheduleType" value={source.schedule_type} />
          <input type="hidden" name="dayOfMonth" value={source.day_of_month ?? 1} />
          <input type="hidden" name="weekendShift" value={source.weekend_holiday_rule} />
          <input type="hidden" name="isVariable" value={source.is_variable ? "on" : ""} />
          <input type="hidden" name="expectedAmount" value={amount ?? ""} />
          <input type="hidden" name="accountId" value={source.account_id} />
          <input type="hidden" name="categoryId" value={source.category_id ?? ""} />
          <label className="flex items-center gap-1.5 text-foreground/50">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={source.is_active}
              className="h-3.5 w-3.5 cursor-pointer rounded border-foreground/30 accent-emerald-500"
            />
            {t.recurringBills.activeLabel}
          </label>
        </form>

        {received ? (
          <span className="text-emerald-500">{t.incomeSources.receivedThisMonth}</span>
        ) : (
          <ReceiveButton
            source={source}
            accounts={accounts}
            allocationRules={allocationRules}
            currency={currency}
            locale={locale}
            t={t}
          />
        )}
        <button type="button" onClick={() => setEditing(true)} className={actionLinkClass}>
          {t.common.edit}
        </button>
        <DeleteSourceButton source={source} t={t} />
      </div>
    </div>
  );
}

function ReceiveButton({
  source,
  accounts,
  allocationRules,
  currency,
  locale,
  t,
}: {
  source: IncomeSource;
  accounts: Account[];
  allocationRules: AllocationRule[];
  currency: string;
  locale: string;
  t: Dictionary;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const defaultAmount = source.is_variable ? source.estimated_amount : source.expected_amount;
  const [amount, setAmount] = useState(String(defaultAmount ?? ""));
  const today = new Date().toISOString().slice(0, 10);

  const numericAmount = Number(amount) || 0;
  const activeRuleCount = allocationRules.filter((r) => r.is_active).length;
  const lines = computeAllocation(numericAmount, allocationRules).filter(
    (l) => l.targetAccountId !== source.account_id,
  );
  const allocatedTotal = lines.reduce((sum, l) => sum + l.amount, 0);
  const remaining = Math.max(0, numericAmount - allocatedTotal);
  const sourceAccount = accounts.find((a) => a.id === source.account_id);
  const sourceAccountName = sourceAccount ? accountDisplayName(sourceAccount, t.common.mainAccount) : "";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={actionLinkClass}>
        {t.incomeSources.markAsReceived}
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
              <h2 className="text-lg font-semibold tracking-tight">{t.incomeSources.markAsReceived}</h2>
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
                  const result = await receiveIncomeSource(formData);
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
              <input type="hidden" name="sourceId" value={source.id} />
              <input type="hidden" name="accountId" value={source.account_id} />
              <input type="hidden" name="categoryId" value={source.category_id ?? ""} />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/50">{t.addTransaction.dateLabel}</label>
                <input type="date" name="date" required defaultValue={today} className={fieldClass} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/50">{t.addTransaction.descriptionLabel}</label>
                <input type="text" name="description" required defaultValue={source.name} className={fieldClass} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/50">{t.incomeSources.expectedAmountLabel}</label>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={fieldClass}
                />
              </div>

              {activeRuleCount > 0 && numericAmount > 0 && (
                <div className="rounded-lg border border-foreground/10 bg-foreground/[0.03] p-3 text-xs">
                  <p className="mb-1.5 font-medium text-foreground/70">{t.incomeSources.allocationPreviewHeading}</p>
                  <ul className="flex flex-col gap-1 text-foreground/60">
                    {lines.map((line) => {
                      const target = accounts.find((a) => a.id === line.targetAccountId);
                      const targetName = target ? accountDisplayName(target, t.common.mainAccount) : "";
                      return (
                        <li key={line.ruleId} className={numericClass}>
                          {formatCurrency(line.amount, currency, locale)} → {targetName}
                        </li>
                      );
                    })}
                    <li className={numericClass}>
                      {format(t.incomeSources.allocationRemaining, {
                        amount: formatCurrency(remaining, currency, locale),
                        account: sourceAccountName,
                      })}
                    </li>
                  </ul>
                </div>
              )}

              <button type="submit" disabled={isPending} className={`${btnPositiveClass} mt-1`}>
                {t.incomeSources.markAsReceived}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function DeleteSourceButton({ source, t }: { source: IncomeSource; t: Dictionary }) {
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
            <h2 className="text-lg font-semibold tracking-tight">{t.incomeSources.deleteTitle}</h2>
            <p className="mt-2 text-sm text-foreground/60">
              {format(t.incomeSources.deleteBody, { name: source.name })}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setOpen(false)} className={btnGhostClass}>
                {t.common.cancel}
              </button>
              <form
                action={async (formData) => {
                  const result = await deleteIncomeSource(formData);
                  notify(result.ok ? t.common.deletedToast : result.error, result.ok ? "success" : "error");
                }}
              >
                <input type="hidden" name="id" value={source.id} />
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

function SourceForm({
  source,
  categories,
  accounts,
  t,
  onDone,
}: {
  source?: IncomeSource;
  categories: Category[];
  accounts: Account[];
  t: Dictionary;
  onDone: () => void;
}) {
  const [scheduleType, setScheduleType] = useState<IncomeScheduleType>(source?.schedule_type ?? "fixed_monthly_date");
  const [isVariable, setIsVariable] = useState(source?.is_variable ?? false);
  const action = source ? updateIncomeSource : addIncomeSource;

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
      className={`${cardClass} flex flex-col gap-3 p-4`}
    >
      {source && <input type="hidden" name="id" value={source.id} />}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-foreground/50">{t.incomeSources.nameLabel}</label>
        <input type="text" name="name" required autoFocus defaultValue={source?.name} className={fieldClass} />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-foreground/50">{t.incomeSources.scheduleTypeLabel}</label>
          <select
            name="scheduleType"
            value={scheduleType}
            onChange={(e) => setScheduleType(e.target.value as IncomeScheduleType)}
            className={fieldClass}
          >
            <option value="fixed_monthly_date">{t.incomeSources.fixedMonthlyLabel}</option>
            <option value="irregular">{t.incomeSources.irregularLabel}</option>
          </select>
        </div>

        {scheduleType === "fixed_monthly_date" && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-foreground/50">{t.incomeSources.dayOfMonthLabel}</label>
              <input
                type="number"
                name="dayOfMonth"
                min={1}
                max={31}
                required
                defaultValue={source?.day_of_month ?? 1}
                className={`${fieldClass} w-20`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-foreground/50">{t.incomeSources.weekendShiftLabel}</label>
              <select name="weekendShift" defaultValue={source?.weekend_holiday_rule ?? "none"} className={fieldClass}>
                <option value="none">{t.incomeSources.weekendShiftNone}</option>
                <option value="shift_earlier">{t.incomeSources.weekendShiftEarlier}</option>
                <option value="shift_later">{t.incomeSources.weekendShiftLater}</option>
              </select>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-foreground/50">
            {isVariable ? t.incomeSources.estimatedAmountLabel : t.incomeSources.expectedAmountLabel}
          </label>
          <input
            type="number"
            name="expectedAmount"
            step="0.01"
            min="0"
            defaultValue={source ? (source.is_variable ? source.estimated_amount ?? undefined : source.expected_amount ?? undefined) : undefined}
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
          {t.incomeSources.variableAmountLabel}
        </label>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-foreground/50">{t.common.account}</label>
          <select name="accountId" defaultValue={source?.account_id ?? accounts[0]?.id} className={fieldClass}>
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
            defaultValue={source?.category_id}
            categoryLabels={t.categories}
            addCategoryT={t.addCategory}
            common={t.common}
          />
        </div>

        <label className="flex items-center gap-1.5 pb-2 text-xs text-foreground/50">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={source?.is_active ?? true}
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
