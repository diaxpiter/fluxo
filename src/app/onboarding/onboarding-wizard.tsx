"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { completeOnboarding } from "@/app/onboarding/actions";
import { WelcomeStep } from "@/app/onboarding/steps/welcome";
import { DayToDayAccountsStep } from "@/app/onboarding/steps/day-to-day-accounts";
import { IncomeStep } from "@/app/onboarding/steps/income";
import { FixedBillsStep } from "@/app/onboarding/steps/fixed-bills";
import { SetAsidesStep } from "@/app/onboarding/steps/set-asides";
import { ReviewStep } from "@/app/onboarding/steps/review";
import { btnPrimaryClass, btnGhostClass } from "@/lib/ui";
import { format } from "@/lib/i18n/format";
import { EMPTY_ONBOARDING_ANSWERS, type OnboardingAnswers } from "@/lib/onboarding";
import type { Dictionary } from "@/lib/i18n/dictionary";

export type StepProps = {
  answers: OnboardingAnswers;
  setAnswers: Dispatch<SetStateAction<OnboardingAnswers>>;
  t: Dictionary;
  currency: string;
  locale: string;
};

const TOTAL_STEPS = 6;

export function OnboardingWizard({
  mainAccountId,
  currency,
  locale,
  t,
}: {
  mainAccountId: string;
  currency: string;
  locale: string;
  t: Dictionary;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    ...EMPTY_ONBOARDING_ANSWERS,
    dayToDayAccounts: [{ name: t.common.mainAccount, startingBalance: 0 }],
  });
  const stepProps: StepProps = { answers, setAnswers, t, currency, locale };

  return (
    <div className="flex flex-col gap-6">
      {step > 0 && (
        <p className="text-xs font-medium text-foreground/50">
          {format(t.onboarding.stepIndicator, { current: step, total: TOTAL_STEPS - 1 })}
        </p>
      )}

      {step === 0 && <WelcomeStep {...stepProps} />}
      {step === 1 && <DayToDayAccountsStep {...stepProps} />}
      {step === 2 && <IncomeStep {...stepProps} />}
      {step === 3 && <FixedBillsStep {...stepProps} />}
      {step === 4 && <SetAsidesStep {...stepProps} />}
      {step === 5 && <ReviewStep {...stepProps} />}

      <div className="flex items-center justify-between gap-3">
        {step > 0 ? (
          <button type="button" onClick={() => setStep((s) => s - 1)} className={btnGhostClass}>
            {t.onboarding.back}
          </button>
        ) : (
          <span />
        )}

        {step < TOTAL_STEPS - 1 ? (
          <button type="button" onClick={() => setStep((s) => s + 1)} className={btnPrimaryClass}>
            {t.onboarding.next}
          </button>
        ) : (
          <form action={completeOnboarding}>
            <input type="hidden" name="mainAccountId" value={mainAccountId} />
            <input type="hidden" name="answers" value={JSON.stringify(answers)} />
            <button type="submit" className={btnPrimaryClass}>
              {t.onboarding.reviewStep.confirmButton}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
