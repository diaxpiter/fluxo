"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

const STORAGE_KEY = "fluxo:hide-amounts";
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

// Server has no localStorage -- render unblurred until the client reads the real preference,
// same as the pre-hydration state, so there's nothing for React to mismatch on.
function getServerSnapshot() {
  return false;
}

function setHidden(next: boolean) {
  window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  listeners.forEach((l) => l());
}

const PrivacyContext = createContext<{ hidden: boolean; toggle: () => void }>({
  hidden: false,
  toggle: () => {},
});

/** Wraps a page's content so `SensitiveValue`/`PrivacyToggle` anywhere inside it share one on/off state. */
export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const hidden = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggle = useCallback(() => setHidden(!hidden), [hidden]);

  return <PrivacyContext.Provider value={{ hidden, toggle }}>{children}</PrivacyContext.Provider>;
}

/** Blurs its children while privacy mode is on -- wrap any amount/balance that should hide. */
export function SensitiveValue({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { hidden } = useContext(PrivacyContext);
  return (
    <span
      className={`${className} inline-block transition-[filter] duration-200 motion-reduce:transition-none ${
        hidden ? "pointer-events-none blur-sm select-none" : ""
      }`}
    >
      {children}
    </span>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.5 18.5 0 0 1 4.22-5.06M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export function PrivacyToggle({ label, revealLabel }: { label: string; revealLabel: string }) {
  const { hidden, toggle } = useContext(PrivacyContext);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={hidden ? revealLabel : label}
      aria-pressed={hidden}
      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground/50 transition-colors duration-150 hover:bg-foreground/[0.06] hover:text-foreground"
    >
      {hidden ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );
}
