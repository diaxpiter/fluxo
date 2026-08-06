"use client";

import type { StepProps } from "@/app/onboarding/onboarding-wizard";
import { PRESET_BILLS, type PresetBillCategoryKey } from "@/lib/onboarding";
import { cardClass, fieldClass, linkClass } from "@/lib/ui";
import type { BillRecurrenceType } from "@/lib/types";

const CATEGORY_KEYS: PresetBillCategoryKey[] = ["housing", "utilities", "subscriptions", "other"];

function weekdayNames(locale: string) {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "long" });
  // Jan 7 2024 was a Sunday, matching JS's getDay() convention (0 = Sunday).
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 7 + i)));
}

function monthNames(locale: string) {
  const fmt = new Intl.DateTimeFormat(locale, { month: "long" });
  return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(2024, i, 1)));
}

export function FixedBillsStep({ answers, setAnswers, t, locale }: StepProps) {
  const bills = answers.bills;
  const addedPresetNames = new Set(bills.map((b) => b.name));
  const today = new Date().toISOString().slice(0, 10);

  function addBill(name: string, categoryKey: PresetBillCategoryKey) {
    setAnswers((prev) => ({
      ...prev,
      bills: [
        ...prev.bills,
        {
          name,
          isVariable: false,
          amount: 0,
          estimatedAmount: null,
          categoryKey,
          recurrenceType: "monthly",
          dueDayOfMonth: 1,
          dueDayOfWeek: 1,
          dueMonth: 1,
          anchorDate: today,
        },
      ],
    }));
  }

  function updateBill(index: number, patch: Partial<(typeof bills)[number]>) {
    setAnswers((prev) => ({
      ...prev,
      bills: prev.bills.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    }));
  }

  function removeBill(index: number) {
    setAnswers((prev) => ({ ...prev, bills: prev.bills.filter((_, i) => i !== index) }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t.onboarding.billsStep.heading}</h1>
        <p className="mt-1 text-sm text-foreground/60">{t.onboarding.billsStep.helpText}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESET_BILLS.filter((p) => !addedPresetNames.has(t.onboarding.billsStep.presetBills[p.key])).map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => addBill(t.onboarding.billsStep.presetBills[preset.key], preset.categoryKey)}
            className={`${linkClass} rounded-lg border border-foreground/10 px-3 py-1.5 text-xs`}
          >
            + {t.onboarding.billsStep.presetBills[preset.key]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => addBill("", "other")}
          className={`${linkClass} rounded-lg border border-foreground/10 px-3 py-1.5 text-xs`}
        >
          {t.onboarding.billsStep.addCustomButton}
        </button>
      </div>

      {bills.length > 0 && (
        <div className={`${cardClass} flex flex-col gap-4 p-4`}>
          {bills.map((bill, i) => {
            const amountValue = bill.isVariable ? bill.estimatedAmount ?? 0 : bill.amount;
            return (
            <div key={i} className="flex flex-col gap-3 border-b border-foreground/5 pb-4 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <label className="text-xs text-foreground/50">{t.onboarding.billsStep.customNameLabel}</label>
                  <input
                    type="text"
                    value={bill.name}
                    onChange={(e) => updateBill(i, { name: e.target.value })}
                    className={fieldClass}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-foreground/50">{t.onboarding.billsStep.categoryLabel}</label>
                  <select
                    value={bill.categoryKey}
                    onChange={(e) => updateBill(i, { categoryKey: e.target.value as PresetBillCategoryKey })}
                    className={fieldClass}
                  >
                    {CATEGORY_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {t.categories[key]}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => removeBill(i)}
                  className={`${linkClass} pb-2 text-xs hover:text-red-400`}
                >
                  {t.onboarding.billsStep.removeBillLabel}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-foreground/50">
                    {bill.isVariable ? t.recurringBills.estimatedAmountLabel : t.recurringBills.amountLabel}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountValue === 0 ? "" : amountValue}
                    onChange={(e) => {
                      const value = e.target.value === "" ? 0 : Number(e.target.value);
                      updateBill(i, bill.isVariable ? { estimatedAmount: value } : { amount: value });
                    }}
                    placeholder={t.addTransaction.amountPlaceholder}
                    className={fieldClass}
                  />
                </div>

                <label className="flex items-center gap-1.5 pb-2 text-xs whitespace-nowrap text-foreground/50 sm:self-end">
                  <input
                    type="checkbox"
                    checked={bill.isVariable}
                    onChange={(e) => updateBill(i, { isVariable: e.target.checked })}
                    className="h-3.5 w-3.5 cursor-pointer rounded border-foreground/30 accent-emerald-500"
                  />
                  {t.recurringBills.variableAmountLabel}
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-foreground/50">{t.recurringBills.frequencyLabel}</label>
                  <select
                    value={bill.recurrenceType}
                    onChange={(e) => updateBill(i, { recurrenceType: e.target.value as BillRecurrenceType })}
                    className={fieldClass}
                  >
                    <option value="monthly">{t.recurringBills.monthlyLabel}</option>
                    <option value="weekly">{t.recurringBills.weeklyLabel}</option>
                    <option value="biweekly">{t.recurringBills.biweeklyLabel}</option>
                    <option value="yearly">{t.recurringBills.yearlyLabel}</option>
                  </select>
                </div>

                {bill.recurrenceType === "monthly" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-foreground/50">{t.recurringBills.dueDayLabel}</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={bill.dueDayOfMonth === 0 ? "" : bill.dueDayOfMonth}
                      onChange={(e) =>
                        updateBill(i, { dueDayOfMonth: e.target.value === "" ? 0 : Number(e.target.value) })
                      }
                      className={fieldClass}
                    />
                  </div>
                )}

                {(bill.recurrenceType === "weekly" || bill.recurrenceType === "biweekly") && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-foreground/50">{t.recurringBills.dayOfWeekLabel}</label>
                    <select
                      value={bill.dueDayOfWeek}
                      onChange={(e) => updateBill(i, { dueDayOfWeek: Number(e.target.value) })}
                      className={fieldClass}
                    >
                      {weekdayNames(locale).map((name, dayIndex) => (
                        <option key={dayIndex} value={dayIndex}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {bill.recurrenceType === "yearly" && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-foreground/50">{t.recurringBills.monthLabel}</label>
                      <select
                        value={bill.dueMonth}
                        onChange={(e) => updateBill(i, { dueMonth: Number(e.target.value) })}
                        className={fieldClass}
                      >
                        {monthNames(locale).map((name, monthIndex) => (
                          <option key={monthIndex} value={monthIndex + 1}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-foreground/50">{t.recurringBills.dueDayLabel}</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={bill.dueDayOfMonth === 0 ? "" : bill.dueDayOfMonth}
                        onChange={(e) =>
                          updateBill(i, { dueDayOfMonth: e.target.value === "" ? 0 : Number(e.target.value) })
                        }
                        className={fieldClass}
                      />
                    </div>
                  </>
                )}

                {bill.recurrenceType === "biweekly" && (
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-xs text-foreground/50">{t.recurringBills.startingFromLabel}</label>
                    <input
                      type="date"
                      value={bill.anchorDate}
                      onChange={(e) => updateBill(i, { anchorDate: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
