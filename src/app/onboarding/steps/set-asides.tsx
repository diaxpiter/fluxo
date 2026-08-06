"use client";

import type { StepProps } from "@/app/onboarding/onboarding-wizard";
import { SET_ASIDE_TYPES, type SetAsideAnswer } from "@/lib/onboarding";
import { cardClass, fieldClass, linkClass } from "@/lib/ui";

export function SetAsidesStep({ answers, setAnswers, t }: StepProps) {
  const setAsides = answers.setAsides;

  function addSetAside() {
    const type = SET_ASIDE_TYPES[0];
    const row: SetAsideAnswer = {
      type,
      name: t.accountTypes[type],
      method: "fixed_amount",
      value: 0,
      includeInOverview: false,
    };
    setAnswers((prev) => ({ ...prev, setAsides: [...prev.setAsides, row] }));
  }

  function updateSetAside(index: number, patch: Partial<SetAsideAnswer>) {
    setAnswers((prev) => ({
      ...prev,
      setAsides: prev.setAsides.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  }

  function removeSetAside(index: number) {
    setAnswers((prev) => ({ ...prev, setAsides: prev.setAsides.filter((_, i) => i !== index) }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t.onboarding.setAsidesStep.heading}</h1>
        <p className="mt-1 text-sm text-foreground/60">{t.onboarding.setAsidesStep.helpText}</p>
      </div>

      {setAsides.length > 0 && (
        <div className={`${cardClass} flex flex-col gap-3 p-4`}>
          {setAsides.map((row, i) => (
            <div key={i} className="flex flex-col gap-2 border-b border-foreground/5 pb-3 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-foreground/50">{t.accounts.typeLabel}</label>
                  <select
                    value={row.type}
                    onChange={(e) => {
                      const type = e.target.value as SetAsideAnswer["type"];
                      updateSetAside(i, { type, name: t.accountTypes[type] });
                    }}
                    className={fieldClass}
                  >
                    {SET_ASIDE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t.accountTypes[type]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <label className="text-xs text-foreground/50">{t.onboarding.setAsidesStep.nameLabel}</label>
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateSetAside(i, { name: e.target.value })}
                    className={fieldClass}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-foreground/50">{t.onboarding.setAsidesStep.amountRowLabel}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={row.value === 0 ? "" : row.value}
                      onChange={(e) => updateSetAside(i, { value: e.target.value === "" ? 0 : Number(e.target.value) })}
                      placeholder={t.addTransaction.amountPlaceholder}
                      className={`${fieldClass} w-24`}
                    />
                    <select
                      value={row.method}
                      onChange={(e) => updateSetAside(i, { method: e.target.value as SetAsideAnswer["method"] })}
                      className={fieldClass}
                    >
                      <option value="fixed_amount">{t.allocationRules.methodFixedAmount}</option>
                      <option value="percentage">{t.onboarding.setAsidesStep.percentOfIncomeOption}</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeSetAside(i)}
                  className={`${linkClass} pb-2 text-xs hover:text-red-400`}
                >
                  {t.onboarding.setAsidesStep.removeSetAsideLabel}
                </button>
              </div>

              {row.type === "sinking_fund" && (
                <p className="text-xs text-foreground/40">{t.onboarding.setAsidesStep.sinkingFundHint}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={addSetAside} className={`${linkClass} self-start text-xs`}>
        {t.onboarding.setAsidesStep.addSetAsideButton}
      </button>
    </div>
  );
}
