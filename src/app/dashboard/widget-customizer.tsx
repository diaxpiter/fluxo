"use client";

import { useState } from "react";
import { updateWidgetPrefs } from "@/app/dashboard/actions";
import type { WidgetPref } from "@/lib/widgets";

export function WidgetCustomizer({ widgets }: { widgets: WidgetPref[] }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-foreground/60 underline underline-offset-4 hover:text-foreground"
      >
        Customize
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4">
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
              className="h-4 w-4 rounded border-foreground/30"
            />
            <input
              type="text"
              name={`title_${w.key}`}
              defaultValue={w.title}
              className="flex-1 rounded-md border border-foreground/15 bg-transparent px-2 py-1 text-sm outline-none focus:border-foreground/40"
            />
          </div>
        ))}

        <div className="mt-1 flex gap-3">
          <button
            type="submit"
            className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background"
          >
            Save
          </button>
          <button type="button" onClick={() => setOpen(false)} className="text-xs text-foreground/60">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
