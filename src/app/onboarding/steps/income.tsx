"use client";

import type { StepProps } from "@/app/onboarding/onboarding-wizard";
import { cardClass, fieldClass, linkClass } from "@/lib/ui";
import type { WeekendHolidayRule } from "@/lib/types";

export function IncomeStep({ answers, setAnswers, t }: StepProps) {
  const income = answers.income;

  function startAnswering() {
    setAnswers((prev) => ({
      ...prev,
      income: {
        name: "",
        scheduleType: "fixed_monthly_date",
        dayOfMonth: 25,
        weekendHolidayRule: "none",
        expectedAmount: null,
      },
    }));
  }

  function skip() {
    setAnswers((prev) => ({ ...prev, income: null }));
  }

  function patch(fields: Partial<NonNullable<typeof income>>) {
    setAnswers((prev) => (prev.income ? { ...prev, income: { ...prev.income, ...fields } } : prev));
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t.onboarding.incomeStep.heading}</h1>
        <p className="mt-1 text-sm text-foreground/60">{t.onboarding.incomeStep.helpText}</p>
      </div>

      {!income ? (
        <button type="button" onClick={startAnswering} className={`${linkClass} self-start text-sm font-medium`}>
          {t.onboarding.incomeStep.startButton}
        </button>
      ) : (
        <div className={`${cardClass} flex flex-col gap-3 p-4`}>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-foreground/50">{t.incomeSources.nameLabel}</label>
            <input
              type="text"
              value={income.name}
              onChange={(e) => patch({ name: e.target.value })}
              autoFocus
              className={fieldClass}
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-foreground/50">{t.incomeSources.scheduleTypeLabel}</label>
              <select
                value={income.scheduleType}
                onChange={(e) => patch({ scheduleType: e.target.value === "irregular" ? "irregular" : "fixed_monthly_date" })}
                className={fieldClass}
              >
                <option value="fixed_monthly_date">{t.incomeSources.fixedMonthlyLabel}</option>
                <option value="irregular">{t.incomeSources.irregularLabel}</option>
              </select>
            </div>

            {income.scheduleType === "fixed_monthly_date" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-foreground/50">{t.incomeSources.dayOfMonthLabel}</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={income.dayOfMonth ?? ""}
                    onChange={(e) => patch({ dayOfMonth: e.target.value === "" ? null : Number(e.target.value) })}
                    className={`${fieldClass} w-20`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-foreground/50">{t.incomeSources.weekendShiftLabel}</label>
                  <select
                    value={income.weekendHolidayRule}
                    onChange={(e) => patch({ weekendHolidayRule: e.target.value as WeekendHolidayRule })}
                    className={fieldClass}
                  >
                    <option value="none">{t.incomeSources.weekendShiftNone}</option>
                    <option value="shift_earlier">{t.incomeSources.weekendShiftEarlier}</option>
                    <option value="shift_later">{t.incomeSources.weekendShiftLater}</option>
                  </select>
                </div>
              </>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-foreground/50">{t.incomeSources.expectedAmountLabel}</label>
              <input
                type="number"
                step="0.01"
                value={income.expectedAmount ?? ""}
                onChange={(e) => patch({ expectedAmount: e.target.value ? Number(e.target.value) : null })}
                className={`${fieldClass} w-28`}
              />
            </div>
          </div>

          <button type="button" onClick={skip} className={`${linkClass} self-start text-xs hover:text-red-400`}>
            {t.onboarding.incomeStep.skipButton}
          </button>
        </div>
      )}
    </div>
  );
}
