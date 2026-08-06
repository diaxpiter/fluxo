"use client";

import { useEffect, useState } from "react";
import { updateLanguage } from "@/app/dashboard/actions";
import { en_US } from "@/lib/i18n/dictionaries/en-US";
import { pt_BR } from "@/lib/i18n/dictionaries/pt-BR";
import { pt_PT } from "@/lib/i18n/dictionaries/pt-PT";
import { LOCALES } from "@/lib/i18n/locales";
import { btnGhostClass, btnPrimaryClass } from "@/lib/ui";
import type { StepProps } from "@/app/onboarding/onboarding-wizard";

// The one screen that intentionally shows every supported language's own word for
// "Welcome" in rotation, before the user has picked one -- like a phone's out-of-box
// "Hello" screen. Reads straight off all three dictionaries rather than just `t`.
const GREETINGS = [en_US.onboarding.welcomeStep.greetingWord, pt_BR.onboarding.welcomeStep.greetingWord, pt_PT.onboarding.welcomeStep.greetingWord];

export function WelcomeStep({ t, locale }: StepProps) {
  const [greetingIndex, setGreetingIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setGreetingIndex((i) => (i + 1) % GREETINGS.length), 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-8 py-10 text-center">
      <p key={greetingIndex} className="animate-fade-in-up text-4xl font-semibold tracking-tight">
        {GREETINGS[greetingIndex]}
      </p>

      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-foreground/50">{t.onboarding.welcomeStep.languageLabel}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {LOCALES.map((l) => (
            <form
              key={l.code}
              action={async (formData) => {
                await updateLanguage(formData);
              }}
            >
              <input type="hidden" name="language" value={l.code} />
              <button type="submit" className={l.code === locale ? btnPrimaryClass : btnGhostClass}>
                {l.nativeName}
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
