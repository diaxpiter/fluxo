"use client";

import { useEffect, useRef, useState } from "react";
import { TOAST_EVENT, type ToastPayload } from "@/lib/toast";

/** Mounted once in the dashboard layout; renders whatever `notify()` sends. */
export function ToastHost() {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onToast(e: Event) {
      const detail = (e as CustomEvent<ToastPayload>).detail;
      setToast(detail);
      setVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setVisible(false), detail.variant === "error" ? 4000 : 2200);
    }

    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  if (!toast) return null;

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[60] flex justify-center px-4 transition-all duration-300 motion-reduce:transition-none ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      }`}
    >
      <div className="flex items-center gap-2 rounded-full border border-foreground/15 bg-background/95 px-4 py-2 text-sm shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-sm">
        <span className={toast.variant === "error" ? "text-red-400" : "text-emerald-500"}>
          {toast.variant === "error" ? "✕" : "✓"}
        </span>
        {toast.message}
      </div>
    </div>
  );
}
