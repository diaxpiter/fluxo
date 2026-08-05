"use client";

import { useRef, useState, useTransition } from "react";
import { transferBetweenAccounts } from "@/app/dashboard/actions";
import { accountDisplayName } from "@/lib/dashboard-data";
import { fieldClass, btnPrimaryClass, linkClass } from "@/lib/ui";
import { notify } from "@/lib/toast";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Account } from "@/lib/types";

export function TransferButton({ accounts, t }: { accounts: Account[]; t: Dictionary }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  if (accounts.length < 2) return null;

  function close() {
    setOpen(false);
    setError(null);
    formRef.current?.reset();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${linkClass} text-xs`}>
        {t.transfer.heading}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={close}
        >
          <div
            className="animate-modal-in w-full max-w-md rounded-2xl border border-foreground/10 bg-background p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">{t.transfer.heading}</h2>
              <button
                type="button"
                onClick={close}
                aria-label={t.addTransaction.closeLabel}
                className="cursor-pointer text-foreground/50 transition-colors hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {error && (
              <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <form
              ref={formRef}
              action={(formData) => {
                startTransition(async () => {
                  const result = await transferBetweenAccounts(formData);
                  if (result.ok) {
                    notify(t.common.savedToast);
                    close();
                  } else {
                    setError(result.error);
                  }
                });
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/50">{t.transfer.fromLabel}</label>
                <select name="fromAccountId" required defaultValue={accounts[0].id} className={fieldClass}>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {accountDisplayName(a, t.common.mainAccount)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/50">{t.transfer.toLabel}</label>
                <select name="toAccountId" required defaultValue={accounts[1].id} className={fieldClass}>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {accountDisplayName(a, t.common.mainAccount)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/50">{t.transfer.amountLabel}</label>
                <input type="number" name="amount" step="0.01" min="0" required placeholder="0.00" className={fieldClass} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/50">{t.transfer.dateLabel}</label>
                <input type="date" name="date" required defaultValue={today} className={fieldClass} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/50">{t.transfer.descriptionLabel}</label>
                <input type="text" name="description" placeholder={t.transfer.heading} className={fieldClass} />
              </div>

              <button type="submit" disabled={isPending} className={`${btnPrimaryClass} mt-1`}>
                {t.transfer.submitButton}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
