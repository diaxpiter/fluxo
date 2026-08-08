"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { deleteTransactions } from "@/app/dashboard/actions";
import { actionLinkClass, btnDestructiveClass, btnGhostClass, cardClass } from "@/lib/ui";
import { format } from "@/lib/i18n/format";
import { notify } from "@/lib/toast";
import type { Dictionary } from "@/lib/i18n/dictionary";

type SelectionContextValue = {
  active: boolean;
  selectedIds: Set<string>;
  start: () => void;
  stop: () => void;
  toggle: (id: string) => void;
};

// Default is an inactive no-op so components used both inside and outside a selection-enabled
// page (e.g. the add-transaction FAB) can read this unconditionally without needing a check.
const INACTIVE: SelectionContextValue = {
  active: false,
  selectedIds: new Set(),
  start: () => {},
  stop: () => {},
  toggle: () => {},
};

const SelectionContext = createContext<SelectionContextValue>(INACTIVE);

/** Wraps a page's transaction list so checkboxes, the header toggle, and the bulk-delete bar share one selection. */
export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const start = useCallback(() => setActive(true), []);
  const stop = useCallback(() => {
    setActive(false);
    setSelectedIds(new Set());
  }, []);
  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ active, selectedIds, start, stop, toggle }),
    [active, selectedIds, start, stop, toggle],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection() {
  return useContext(SelectionContext);
}

export function SelectionToggle({ t, common }: { t: Dictionary["transactionList"]; common: Dictionary["common"] }) {
  const { active, start, stop } = useSelection();

  return (
    <button type="button" onClick={active ? stop : start} className={`${actionLinkClass} text-xs`}>
      {active ? common.cancel : t.selectButton}
    </button>
  );
}

export function SelectionActionBar({ t, common }: { t: Dictionary["transactionList"]; common: Dictionary["common"] }) {
  const { active, selectedIds, stop } = useSelection();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!active || selectedIds.size === 0) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
        <div className={`${cardClass} flex w-full max-w-3xl items-center justify-between gap-3 bg-background/95 p-3 backdrop-blur-sm`}>
          <span className="pl-1 text-sm text-foreground/70">{format(t.selectedCount, { count: selectedIds.size })}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={stop} className={btnGhostClass}>
              {common.cancel}
            </button>
            <button type="button" onClick={() => setConfirmOpen(true)} className={btnDestructiveClass}>
              {common.delete}
            </button>
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="animate-modal-in w-full max-w-sm rounded-2xl border border-foreground/10 bg-background p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold tracking-tight">
              {format(t.deleteSelectedTitle, { count: selectedIds.size })}
            </h2>
            <p className="mt-2 text-sm text-foreground/60">{format(t.deleteSelectedBody, { count: selectedIds.size })}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setConfirmOpen(false)} className={btnGhostClass}>
                {common.cancel}
              </button>
              <form
                action={async (formData) => {
                  const result = await deleteTransactions(formData);
                  setConfirmOpen(false);
                  if (result.ok) {
                    notify(common.deletedToast);
                    stop();
                  } else {
                    notify(result.error, "error");
                  }
                }}
              >
                {[...selectedIds].map((id) => (
                  <input key={id} type="hidden" name="id" value={id} />
                ))}
                <button type="submit" className={`${btnDestructiveClass} w-full`}>
                  {common.delete}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
