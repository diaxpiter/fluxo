"use client";

import { useState } from "react";
import { updateWidgetPrefs } from "@/app/dashboard/actions";
import { cardClass, fieldClass, btnPrimaryClass, linkClass } from "@/lib/ui";
import type { WidgetPref } from "@/lib/widgets";

export function WidgetCustomizer({ widgets }: { widgets: WidgetPref[] }) {
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState(widgets);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOrder(widgets);
          setOpen(true);
        }}
        className={`${linkClass} text-xs`}
      >
        Customize
      </button>
    );
  }

  function move(index: number, direction: -1 | 1) {
    setOrder((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div className={`${cardClass} animate-fade-in-up p-4`}>
      <form
        action={async (formData) => {
          await updateWidgetPrefs(formData);
          setOpen(false);
        }}
        className="flex flex-col gap-2"
      >
        {order.map((w, i) => (
          <div key={w.key} className="flex items-center gap-2">
            <input type="hidden" name="order" value={w.key} />

            <div className="flex flex-col leading-none">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Move up"
                className="cursor-pointer px-1 py-0.5 text-foreground/40 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-20"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === order.length - 1}
                aria-label="Move down"
                className="cursor-pointer px-1 py-0.5 text-foreground/40 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-20"
              >
                ▼
              </button>
            </div>

            <input
              type="checkbox"
              name={`visible_${w.key}`}
              defaultChecked={w.visible}
              aria-label={`Show ${w.title}`}
              className="h-4 w-4 cursor-pointer rounded border-foreground/30 accent-emerald-500"
            />
            <input type="text" name={`title_${w.key}`} defaultValue={w.title} className={`${fieldClass} flex-1`} />
          </div>
        ))}

        <div className="mt-2 flex items-center gap-4">
          <button type="submit" className={btnPrimaryClass}>
            Save
          </button>
          <button type="button" onClick={() => setOpen(false)} className={`${linkClass} text-xs`}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
