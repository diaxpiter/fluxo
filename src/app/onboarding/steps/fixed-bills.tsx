"use client";

import type { StepProps } from "@/app/onboarding/onboarding-wizard";
import { PRESET_BILLS, type PresetBillCategoryKey } from "@/lib/onboarding";
import { cardClass, fieldClass, linkClass } from "@/lib/ui";

const CATEGORY_KEYS: PresetBillCategoryKey[] = ["housing", "utilities", "subscriptions", "other"];

export function FixedBillsStep({ answers, setAnswers, t }: StepProps) {
  const bills = answers.bills;
  const addedPresetNames = new Set(bills.map((b) => b.name));

  function addBill(name: string, categoryKey: PresetBillCategoryKey) {
    setAnswers((prev) => ({
      ...prev,
      bills: [...prev.bills, { name, amount: 0, dueDayOfMonth: 1, categoryKey }],
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
        <div className={`${cardClass} flex flex-col gap-3 p-4`}>
          {bills.map((bill, i) => (
            <div key={i} className="flex flex-wrap items-end gap-3 border-b border-foreground/5 pb-3 last:border-0 last:pb-0">
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
                <label className="text-xs text-foreground/50">{t.recurringBills.amountLabel}</label>
                <input
                  type="number"
                  step="0.01"
                  value={bill.amount}
                  onChange={(e) => updateBill(i, { amount: Number(e.target.value) })}
                  className={`${fieldClass} w-24`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-foreground/50">{t.recurringBills.dueDayLabel}</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={bill.dueDayOfMonth}
                  onChange={(e) => updateBill(i, { dueDayOfMonth: Number(e.target.value) })}
                  className={`${fieldClass} w-16`}
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
          ))}
        </div>
      )}
    </div>
  );
}
