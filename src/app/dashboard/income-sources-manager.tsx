"use client";

import { useRef, useState, useTransition } from "react";
import {
  addIncomeSource,
  updateIncomeSource,
  deleteIncomeSource,
  receiveIncomeSource,
} from "@/app/dashboard/actions";
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
  numericClass,
} from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { categoryDisplayName } from "@/lib/dashboard-data";
import type { Category, IncomeScheduleType, IncomeSource } from "@/lib/types";

export function IncomeSourcesManager({
  sources,
  receivedSourceIds,
  categories,
  accountId,
  currency,
  locale,
  t,
}: {
  sources: IncomeSource[];
  receivedSourceIds: string[];
  categories: Category[];
  accountId: string;
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
              accountId={accountId}
              currency={currency}
              locale={locale}
              t={t}
            />
          ))}
        </div>
      )}

      {adding ? (
        <SourceForm categories={categories} accountId={accountId} t={t} onDone={() => setAdding(false)} />
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
  accountId,
  currency,
  locale,
  t,
}: {
  source: IncomeSource;
  received: boolean;
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
        <SourceForm
          source={source}
          categories={categories}
          accountId={accountId}
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

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground/5 p-4 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{source.name}</p>
        <p className="mt-0.5 truncate text-xs text-foreground/50">
          {scheduleBadge} · {categoryName}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {source.expected_amount != null && (
          <p className={`text-sm ${numericClass}`}>{formatCurrency(source.expected_amount, currency, locale)}</p>
        )}

        <form action={updateIncomeSource} onChange={(e) => e.currentTarget.requestSubmit()}>
          <input type="hidden" name="id" value={source.id} />
          <input type="hidden" name="name" value={source.name} />
          <input type="hidden" name="scheduleType" value={source.schedule_type} />
          <input type="hidden" name="dayOfMonth" value={source.day_of_month ?? 1} />
          <input type="hidden" name="weekendShift" value={source.weekend_holiday_rule} />
          <input type="hidden" name="expectedAmount" value={source.expected_amount ?? ""} />
          <input type="hidden" name="accountId" value={accountId} />
          <input type="hidden" name="categoryId" value={source.category_id ?? ""} />
          <label className="flex items-center gap-1.5 text-xs text-foreground/50">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={source.is_active}
              className="h-3.5 w-3.5 cursor-pointer rounded border-foreground/30 accent-emerald-500"
            />
            {t.recurringBills.activeLabel}
          </label>
        </form>

        <div className="flex items-center gap-3 text-xs">
          {received ? (
            <span className="text-emerald-500">{t.incomeSources.receivedThisMonth}</span>
          ) : (
            <ReceiveButton source={source} accountId={accountId} t={t} />
          )}
          <button type="button" onClick={() => setEditing(true)} className={linkClass}>
            {t.common.edit}
          </button>
          <DeleteSourceButton source={source} t={t} />
        </div>
      </div>
    </div>
  );
}

function ReceiveButton({ source, accountId, t }: { source: IncomeSource; accountId: string; t: Dictionary }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={linkClass}>
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
                  await receiveIncomeSource(formData);
                  setOpen(false);
                });
              }}
              className="flex flex-col gap-4"
            >
              <input type="hidden" name="sourceId" value={source.id} />
              <input type="hidden" name="accountId" value={accountId} />
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
                  defaultValue={source.expected_amount ?? undefined}
                  className={fieldClass}
                />
              </div>

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
            <h2 className="text-lg font-semibold tracking-tight">{t.incomeSources.deleteTitle}</h2>
            <p className="mt-2 text-sm text-foreground/60">
              {format(t.incomeSources.deleteBody, { name: source.name })}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setOpen(false)} className={btnGhostClass}>
                {t.common.cancel}
              </button>
              <form action={deleteIncomeSource}>
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
  accountId,
  t,
  onDone,
}: {
  source?: IncomeSource;
  categories: Category[];
  accountId: string;
  t: Dictionary;
  onDone: () => void;
}) {
  const [scheduleType, setScheduleType] = useState<IncomeScheduleType>(source?.schedule_type ?? "fixed_monthly_date");
  const action = source ? updateIncomeSource : addIncomeSource;

  return (
    <form
      action={async (formData) => {
        await action(formData);
        onDone();
      }}
      className={`${cardClass} flex flex-col gap-3 p-4`}
    >
      {source && <input type="hidden" name="id" value={source.id} />}
      <input type="hidden" name="accountId" value={accountId} />

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
          <label className="text-xs text-foreground/50">{t.incomeSources.expectedAmountLabel}</label>
          <input
            type="number"
            name="expectedAmount"
            step="0.01"
            min="0"
            defaultValue={source?.expected_amount ?? undefined}
            className={`${fieldClass} w-28`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-foreground/50">{t.addTransaction.categoryLabel}</label>
          <select name="categoryId" defaultValue={source?.category_id ?? ""} className={fieldClass}>
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
