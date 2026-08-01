"use client";

import { useState } from "react";
import { updateWidgetPrefs } from "@/app/dashboard/actions";
import { cardClass, fieldClass, btnPrimaryClass, linkClass } from "@/lib/ui";
import type { WidgetPref } from "@/lib/widgets";

export function WidgetCustomizer({ widgets }: { widgets: WidgetPref[] }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${linkClass} text-xs`}>
        Customize
      </button>
    );
  }

  return (
    <div className={`${cardClass} animate-fade-in-up p-4`}>
      <p className="mb-3 text-xs text-foreground/50">
        Widgets sharing a tier split that row evenly; a widget alone in its tier fills the row.
      </p>
      <form
        action={async (formData) => {
          await updateWidgetPrefs(formData);
          setOpen(false);
        }}
        className="flex flex-col gap-2"
      >
        {widgets.map((w) => (
          <div key={w.key} className="flex flex-wrap items-center gap-2 border-b border-foreground/5 pb-2 last:border-0 last:pb-0">
            <input type="hidden" name="order" value={w.key} />

            <div className="flex min-w-0 flex-1 items-center gap-2 basis-full sm:basis-auto">
              <input
                type="checkbox"
                name={`visible_${w.key}`}
                defaultChecked={w.visible}
                aria-label={`Show ${w.title}`}
                className="h-4 w-4 shrink-0 cursor-pointer rounded border-foreground/30 accent-emerald-500"
              />
              <input type="text" name={`title_${w.key}`} defaultValue={w.title} className={`${fieldClass} min-w-0 flex-1`} />
            </div>
            <div className="ml-6 flex shrink-0 items-center gap-1.5 sm:ml-0">
              <label htmlFor={`tier_${w.key}`} className="text-xs text-foreground/50">
                Tier
              </label>
              <input
                id={`tier_${w.key}`}
                type="number"
                name={`tier_${w.key}`}
                min={1}
                max={9}
                defaultValue={w.tier}
                className={`${fieldClass} w-14 text-center`}
              />
            </div>
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
