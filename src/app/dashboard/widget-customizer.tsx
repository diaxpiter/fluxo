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
      <form
        action={async (formData) => {
          await updateWidgetPrefs(formData);
          setOpen(false);
        }}
        className="flex flex-col gap-3"
      >
        {widgets.map((w) => (
          <div key={w.key} className="flex items-center gap-3">
            <input
              type="checkbox"
              name={`visible_${w.key}`}
              defaultChecked={w.visible}
              className="h-4 w-4 cursor-pointer rounded border-foreground/30 accent-emerald-500"
            />
            <input type="text" name={`title_${w.key}`} defaultValue={w.title} className={`${fieldClass} flex-1`} />
          </div>
        ))}

        <div className="mt-1 flex items-center gap-4">
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
