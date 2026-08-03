"use client";

import { useRef, useState, useTransition } from "react";
import { importTransactions, type ImportResult } from "@/app/dashboard/actions";
import { formatCurrency } from "@/lib/currency";
import { cardClass, btnPrimaryClass, btnGhostClass, linkClass, numericClass } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { format } from "@/lib/i18n/format";

export function ImportTransactions({
  accountId,
  currency,
  locale,
  t,
}: {
  accountId: string;
  currency: string;
  locale: string;
  t: Dictionary["importTransactions"];
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function close() {
    setOpen(false);
    setResult(null);
    formRef.current?.reset();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${linkClass} text-xs`}>
        {t.linkText}
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={close}
    >
      <div
        className="animate-modal-in w-full max-w-md rounded-2xl border border-foreground/10 bg-background p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">{t.heading}</h2>
          <button
            type="button"
            onClick={close}
            aria-label={t.closeLabel}
            className="cursor-pointer text-foreground/50 transition-colors hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {!result && (
          <>
            <p className="mb-4 text-sm text-foreground/60">{t.helpText}</p>
            <form
              ref={formRef}
              action={(formData) => {
                startTransition(async () => {
                  const res = await importTransactions(formData);
                  setResult(res);
                });
              }}
              className="flex flex-col gap-4"
            >
              <input type="hidden" name="accountId" value={accountId} />
              <input
                type="file"
                name="file"
                accept=".xlsx"
                required
                className="text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-foreground file:px-3 file:py-2 file:text-sm file:font-medium file:text-background"
              />
              <button type="submit" disabled={isPending} className={`${btnPrimaryClass} mt-1`}>
                {isPending ? t.importingButton : t.importButton}
              </button>
            </form>
          </>
        )}

        {result && !result.ok && (
          <div className="flex flex-col gap-4">
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {result.error}
            </p>
            <button type="button" onClick={close} className={btnGhostClass}>
              {t.closeLabel}
            </button>
          </div>
        )}

        {result && result.ok && (
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              {format(t.summary, {
                count: result.insertedCount,
                balance: formatCurrency(result.startingBalance, currency, locale),
              })}
            </p>

            <div className={`${cardClass} divide-y divide-foreground/5`}>
              {result.monthChecks.map((m) => (
                <div key={m.sheet} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-foreground/70">{m.sheet}</span>
                  <span className="flex items-center gap-2">
                    <span className={numericClass}>{formatCurrency(m.computedEndBalance, currency, locale)}</span>
                    <span className={m.matches ? "text-emerald-500" : "text-red-400"}>
                      {m.matches ? "✓" : `✗ (expected ${formatCurrency(m.expectedEndBalance, currency, locale)})`}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <button type="button" onClick={close} className={btnPrimaryClass}>
              {t.done}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
