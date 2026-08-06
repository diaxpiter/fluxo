"use client";

import { useState, useTransition } from "react";
import { enrollMfa, verifyMfaEnrollment, unenrollMfa } from "@/app/auth/actions";
import { cardClass, fieldClass, btnPrimaryClass, btnGhostClass, btnDestructiveClass } from "@/lib/ui";
import { notify } from "@/lib/toast";
import type { Dictionary } from "@/lib/i18n/dictionary";

type Factor = { id: string };
type Enrollment = { factorId: string; qrCode: string; secret: string };

export function MfaSettings({ t, initialFactor }: { t: Dictionary; initialFactor: Factor | null }) {
  const [, startTransition] = useTransition();
  const [factor, setFactor] = useState<Factor | null>(initialFactor);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [confirmingDisable, setConfirmingDisable] = useState(false);
  const s = t.mfaSettings;

  function startEnroll() {
    startTransition(async () => {
      const result = await enrollMfa();
      if (result.ok) {
        setEnrollment({ factorId: result.factorId, qrCode: result.qrCode, secret: result.secret });
      } else {
        notify(result.error, "error");
      }
    });
  }

  function submitVerify(formData: FormData) {
    startTransition(async () => {
      const result = await verifyMfaEnrollment(formData);
      if (result.ok) {
        setFactor({ id: enrollment!.factorId });
        setEnrollment(null);
        notify(s.enabledLabel);
      } else {
        notify(result.error, "error");
      }
    });
  }

  function disable() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("factorId", factor!.id);
      const result = await unenrollMfa(formData);
      if (result.ok) {
        setFactor(null);
        setConfirmingDisable(false);
      } else {
        notify(result.error, "error");
      }
    });
  }

  return (
    <div className={`${cardClass} flex flex-col gap-4 p-4`}>
      <p className="text-sm text-foreground/50">{s.description}</p>

      {enrollment ? (
        <form action={submitVerify} className="flex flex-col gap-3">
          <input type="hidden" name="factorId" value={enrollment.factorId} />
          <p className="text-sm text-foreground/70">{s.scanHelpText}</p>
          <div
            className="w-fit rounded-lg bg-white p-2"
            dangerouslySetInnerHTML={{ __html: enrollment.qrCode }}
          />
          <p className="font-mono text-xs text-foreground/40 break-all">{enrollment.secret}</p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="mfa-code" className="text-sm font-medium text-foreground/70">
              {s.codeLabel}
            </label>
            <input
              id="mfa-code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              className={`${fieldClass} max-w-[10rem]`}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" className={btnGhostClass} onClick={() => setEnrollment(null)}>
              {s.cancelButton}
            </button>
            <button type="submit" className={btnPrimaryClass}>
              {s.verifyButton}
            </button>
          </div>
        </form>
      ) : factor ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-emerald-400">{s.enabledLabel}</span>
          {confirmingDisable ? (
            <div className="flex flex-col items-end gap-2">
              <p className="text-right text-xs text-foreground/50">{s.disableConfirmBody}</p>
              <div className="flex gap-2">
                <button type="button" className={btnGhostClass} onClick={() => setConfirmingDisable(false)}>
                  {t.common.cancel}
                </button>
                <button type="button" className={btnDestructiveClass} onClick={disable}>
                  {s.disableButton}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className={btnGhostClass} onClick={() => setConfirmingDisable(true)}>
              {s.disableButton}
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-foreground/50">{s.disabledLabel}</span>
          <button type="button" className={btnPrimaryClass} onClick={startEnroll}>
            {s.enrollButton}
          </button>
        </div>
      )}
    </div>
  );
}
