export const TOAST_EVENT = "app:toast";

export type ToastPayload = { message: string; variant: "success" | "error" };

/** Fires a brief confirmation toast from any client component -- see `ToastHost`. */
export function notify(message: string, variant: "success" | "error" = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT, { detail: { message, variant } }));
}
