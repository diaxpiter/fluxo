export const TOAST_EVENT = "app:toast";

/** Fires a brief confirmation toast from any client component -- see `ToastHost`. */
export function notify(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<string>(TOAST_EVENT, { detail: message }));
}
