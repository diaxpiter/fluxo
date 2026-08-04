export const cardClass = "rounded-2xl border border-foreground/10 bg-foreground/[0.04]";

export const fieldClass =
  "rounded-lg border border-foreground/10 bg-foreground/[0.03] px-3 py-2 text-sm outline-none transition-colors duration-150 placeholder:text-foreground/35 focus:border-foreground/30 focus:bg-foreground/[0.05] focus:ring-2 focus:ring-foreground/10";

export const btnPrimaryClass =
  "inline-flex cursor-pointer items-center justify-center rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

export const btnGhostClass =
  "inline-flex cursor-pointer items-center justify-center rounded-lg border border-foreground/10 bg-transparent px-3 py-2 text-sm font-medium transition-colors duration-150 hover:bg-foreground/[0.05]";

export const btnPositiveClass =
  "inline-flex cursor-pointer items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-sm font-medium text-emerald-400 transition-colors duration-150 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50";

export const btnDestructiveClass =
  "inline-flex cursor-pointer items-center justify-center rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-400 transition-colors duration-150 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50";

export const numericClass = "font-mono tabular-nums";

export const linkClass =
  "cursor-pointer text-foreground/50 underline decoration-foreground/20 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground";

// Same look as linkClass, but with a larger tap target for the small inline
// actions packed into settings rows (edit/delete/pay/move) — the padding is
// offset by a matching negative margin so it doesn't shift surrounding layout.
export const actionLinkClass = `${linkClass} -m-1.5 p-1.5`;
