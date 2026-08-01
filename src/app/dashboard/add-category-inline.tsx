"use client";

import { useRef, useState } from "react";
import { addCategory } from "@/app/dashboard/actions";

export function AddCategoryInline() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 self-start text-xs text-foreground/60 underline underline-offset-4 hover:text-foreground"
      >
        + New category
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await addCategory(formData);
        formRef.current?.reset();
        setOpen(false);
      }}
      className="mt-1 flex items-center gap-2"
    >
      <input
        type="text"
        name="name"
        autoFocus
        required
        placeholder="Category name"
        className="w-full rounded-md border border-foreground/15 bg-transparent px-2 py-1 text-xs outline-none focus:border-foreground/40"
      />
      <button type="submit" className="shrink-0 text-xs font-medium underline underline-offset-4">
        Save
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="shrink-0 text-xs text-foreground/60"
      >
        Cancel
      </button>
    </form>
  );
}
