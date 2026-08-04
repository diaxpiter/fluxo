"use client";

import type { StepProps } from "@/app/onboarding/onboarding-wizard";
import { cardClass, fieldClass, linkClass } from "@/lib/ui";

export function DayToDayAccountsStep({ answers, setAnswers, t }: StepProps) {
  const accounts = answers.dayToDayAccounts;

  function updateAccount(index: number, patch: Partial<{ name: string; startingBalance: number }>) {
    setAnswers((prev) => ({
      ...prev,
      dayToDayAccounts: prev.dayToDayAccounts.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    }));
  }

  function addAccount() {
    setAnswers((prev) => ({
      ...prev,
      dayToDayAccounts: [...prev.dayToDayAccounts, { name: "", startingBalance: 0 }],
    }));
  }

  function removeAccount(index: number) {
    setAnswers((prev) => ({
      ...prev,
      dayToDayAccounts: prev.dayToDayAccounts.filter((_, i) => i !== index),
    }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t.onboarding.accountsStep.heading}</h1>
        <p className="mt-1 text-sm text-foreground/60">{t.onboarding.accountsStep.helpText}</p>
      </div>

      <div className={`${cardClass} flex flex-col gap-3 p-4`}>
        {accounts.map((account, i) => (
          <div key={i} className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <label className="text-xs text-foreground/50">{t.accounts.nameLabel}</label>
              <input
                type="text"
                value={account.name}
                onChange={(e) => updateAccount(i, { name: e.target.value })}
                autoFocus={i === 0}
                className={fieldClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-foreground/50">{t.accounts.startingBalanceLabel}</label>
              <input
                type="number"
                step="0.01"
                value={account.startingBalance}
                onChange={(e) => updateAccount(i, { startingBalance: Number(e.target.value) })}
                className={`${fieldClass} w-28`}
              />
            </div>
            {i > 0 && (
              <button
                type="button"
                onClick={() => removeAccount(i)}
                className={`${linkClass} pb-2 text-xs hover:text-red-400`}
              >
                {t.onboarding.accountsStep.removeAccountLabel}
              </button>
            )}
          </div>
        ))}
      </div>

      <button type="button" onClick={addAccount} className={`${linkClass} self-start text-xs`}>
        {t.onboarding.accountsStep.addAccountButton}
      </button>
    </div>
  );
}
