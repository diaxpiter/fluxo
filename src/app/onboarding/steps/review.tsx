"use client";

import type { StepProps } from "@/app/onboarding/onboarding-wizard";
import { orderedSetAsides } from "@/lib/onboarding";
import { computeAllocation } from "@/lib/allocation";
import { formatCurrency } from "@/lib/currency";
import { format } from "@/lib/i18n/format";
import { cardClass } from "@/lib/ui";
import type { AllocationRule } from "@/lib/types";

export function ReviewStep({ answers, setAnswers, t, currency, locale }: StepProps) {
  const ordered = orderedSetAsides(answers.setAsides);
  const mainAccountName = answers.dayToDayAccounts[0]?.name || t.common.mainAccount;
  // The server always stores the absolute value (see completeOnboarding) -- preview the same
  // magnitude here so a mistyped negative number doesn't show one figure and create another.
  const incomeAmount = Math.abs(answers.income?.expectedAmount ?? 0);

  // Derived from the actual data rather than separate state, so revisiting this step after
  // Back/Next always reflects what's really set instead of resetting to a hardcoded default.
  const overviewMode: "single" | "freeToSpend" =
    ordered.length > 0 && ordered.every((row) => row.includeInOverview) ? "single" : "freeToSpend";

  function applyOverviewMode(mode: "single" | "freeToSpend") {
    setAnswers((prev) => ({
      ...prev,
      setAsides: prev.setAsides.map((s) => ({ ...s, includeInOverview: mode === "single" })),
    }));
  }

  function toggleRowOverview(orderedIndex: number, checked: boolean) {
    const row = ordered[orderedIndex];
    setAnswers((prev) => ({
      ...prev,
      setAsides: prev.setAsides.map((s) => (s === row ? { ...s, includeInOverview: checked } : s)),
    }));
  }

  const previewRules: AllocationRule[] = ordered.map((row, i) => ({
    id: String(i),
    user_id: "",
    space_id: "",
    target_account_id: String(i),
    priority_order: i,
    method: row.method,
    value: row.method === "percentage" ? Math.min(Math.abs(row.value), 100) : Math.abs(row.value),
    is_active: true,
    created_at: "",
  }));
  const lines = incomeAmount > 0 ? computeAllocation(incomeAmount, previewRules) : [];
  const claimedTotal = lines.reduce((sum, l) => sum + l.amount, 0);
  const remaining = incomeAmount - claimedTotal;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t.onboarding.reviewStep.heading}</h1>
        <p className="mt-1 text-sm text-foreground/60">{t.onboarding.reviewStep.helpText}</p>
      </div>

      {ordered.length > 0 && (
        <div className={`${cardClass} flex flex-col gap-2 p-4`}>
          <p className="text-sm font-medium text-foreground/70">{t.onboarding.reviewStep.overviewQuestion}</p>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={overviewMode === "single"}
                onChange={() => applyOverviewMode("single")}
                className="accent-emerald-500"
              />
              {t.onboarding.reviewStep.singleBalanceOption}
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={overviewMode === "freeToSpend"}
                onChange={() => applyOverviewMode("freeToSpend")}
                className="accent-emerald-500"
              />
              {t.onboarding.reviewStep.freeToSpendOption}
            </label>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground/50">{t.onboarding.reviewStep.accountsHeading}</h2>
        <div className={cardClass}>
          {answers.dayToDayAccounts.map((a, i) => (
            <div key={i} className="flex items-center justify-between gap-3 border-b border-foreground/5 p-3 last:border-0">
              <p className="text-sm">{a.name || t.common.mainAccount}</p>
              <p className="text-sm text-foreground/50">{formatCurrency(a.startingBalance, currency, locale)}</p>
            </div>
          ))}
          {ordered.map((row, i) => (
            <div key={i} className="flex items-center justify-between gap-3 border-b border-foreground/5 p-3 last:border-0">
              <div>
                <p className="text-sm">{row.name}</p>
                <p className="text-xs text-foreground/40">{t.accountTypes[row.type]}</p>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-foreground/50">
                <input
                  type="checkbox"
                  checked={row.includeInOverview}
                  onChange={(e) => toggleRowOverview(i, e.target.checked)}
                  className="h-3.5 w-3.5 cursor-pointer rounded border-foreground/30 accent-emerald-500"
                />
                {t.accounts.includeInOverviewLabel}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground/50">{t.onboarding.reviewStep.incomeHeading}</h2>
        {!answers.income ? (
          <p className="text-sm text-foreground/50">{t.onboarding.reviewStep.noIncome}</p>
        ) : (
          <div className={`${cardClass} p-3 text-sm`}>{answers.income.name || t.incomeSources.heading}</div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground/50">{t.onboarding.reviewStep.billsHeading}</h2>
        {answers.bills.length === 0 ? (
          <p className="text-sm text-foreground/50">{t.onboarding.reviewStep.noBills}</p>
        ) : (
          <div className={cardClass}>
            {answers.bills.map((bill, i) => (
              <div key={i} className="flex items-center justify-between gap-3 border-b border-foreground/5 p-3 last:border-0">
                <p className="text-sm">{bill.name}</p>
                <p className="text-sm text-foreground/50">{formatCurrency(Math.abs(bill.amount), currency, locale)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground/50">{t.onboarding.reviewStep.setAsidesHeading}</h2>
        {ordered.length === 0 ? (
          <p className="text-sm text-foreground/50">{t.onboarding.reviewStep.noSetAsides}</p>
        ) : (
          <div className={`${cardClass} p-3 text-sm`}>
            {ordered.map((row, i) => {
              const line = lines.find((l) => l.targetAccountId === String(i));
              return (
                <p key={i}>
                  {incomeAmount > 0
                    ? format(t.onboarding.reviewStep.allocationLine, {
                        amount: formatCurrency(line?.amount ?? 0, currency, locale),
                        account: row.name,
                      })
                    : `${row.name} — ${row.method === "fixed_amount" ? t.allocationRules.methodFixedAmount : t.allocationRules.methodPercentage} ${Math.abs(row.value)}`}
                </p>
              );
            })}
            {incomeAmount > 0 && (
              <p className="mt-1 text-foreground/50">
                {format(t.onboarding.reviewStep.remainderLine, {
                  amount: formatCurrency(remaining, currency, locale),
                  account: mainAccountName,
                })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
