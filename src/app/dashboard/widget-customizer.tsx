"use client";

import { useState } from "react";
import { updateWidgetPrefs } from "@/app/dashboard/actions";
import { btnPrimaryClass, linkClass } from "@/lib/ui";
import { type WidgetKey, type WidgetPref } from "@/lib/widgets";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { format } from "@/lib/i18n/format";

export function WidgetCustomizer({
  widgets,
  t,
  widgetTitles,
  common,
}: {
  widgets: WidgetPref[];
  t: Dictionary["widgetCustomizer"];
  widgetTitles: Dictionary["widgets"];
  common: Dictionary["common"];
}) {
  const [order, setOrder] = useState<WidgetKey[]>(widgets.map((w) => w.key));
  const byKey = new Map(widgets.map((w) => [w.key, w]));

  function move(key: WidgetKey, direction: -1 | 1) {
    setOrder((prev) => {
      const i = prev.indexOf(key);
      const j = i + direction;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  return (
    <div>
      <p className="mb-3 text-xs text-foreground/50">{t.helpText}</p>
      <form action={updateWidgetPrefs} className="flex flex-col gap-1">
        {order.map((key, i) => {
          const w = byKey.get(key);
          if (!w) return null;
          return (
            <div
              key={key}
              className="flex flex-wrap items-center gap-3 border-b border-foreground/5 py-2.5 last:border-0"
            >
              <input type="hidden" name="order" value={key} />

              <input
                type="checkbox"
                name={`visible_${key}`}
                defaultChecked={w.visible}
                aria-label={widgetTitles[key]}
                className="h-4 w-4 shrink-0 cursor-pointer rounded border-foreground/30 accent-emerald-500"
              />

              <span className="min-w-0 flex-1 basis-40 text-sm">{widgetTitles[key]}</span>

              <label className="flex shrink-0 items-center gap-1.5 text-xs text-foreground/50">
                <input
                  type="checkbox"
                  name={`wide_${key}`}
                  defaultChecked={w.wide}
                  className="h-3.5 w-3.5 cursor-pointer rounded border-foreground/30 accent-emerald-500"
                />
                {t.wide}
              </label>

              <div className="flex shrink-0 items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => move(key, -1)}
                  disabled={i === 0}
                  className={`${linkClass} disabled:pointer-events-none disabled:opacity-30`}
                  aria-label={format(t.moveUp, { title: widgetTitles[key] })}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(key, 1)}
                  disabled={i === order.length - 1}
                  className={`${linkClass} disabled:pointer-events-none disabled:opacity-30`}
                  aria-label={format(t.moveDown, { title: widgetTitles[key] })}
                >
                  ↓
                </button>
              </div>
            </div>
          );
        })}

        <button type="submit" className={`${btnPrimaryClass} mt-3 self-start`}>
          {common.save}
        </button>
      </form>
    </div>
  );
}
