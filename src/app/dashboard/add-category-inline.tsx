"use client";

import { useRef, useState, useTransition } from "react";
import { addCategory } from "@/app/dashboard/actions";
import { fieldClass, linkClass } from "@/lib/ui";
import { notify } from "@/lib/toast";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Category } from "@/lib/types";

export function AddCategoryInline({
  t,
  common,
  onCreated,
}: {
  t: Dictionary["addCategory"];
  common: Dictionary["common"];
  /** Called with the newly created category so the caller can select it immediately -- it's already
   * persisted and available to every other transaction/bill/income form from this point on. */
  onCreated: (category: Category) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${linkClass} mt-1 self-start text-xs`}>
        {t.newCategory}
      </button>
    );
  }

  // A plain <div>, not a <form> -- this is always rendered inside another form (via CategorySelect,
  // on the transaction/bill/income source forms), and HTML doesn't allow nested forms.
  const submit = () => {
    const name = inputRef.current?.value.trim();
    if (!name) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name);
      const category = await addCategory(formData);
      if (category) {
        onCreated(category);
        notify(common.savedToast);
      } else {
        notify(common.errorToast, "error");
      }
      if (inputRef.current) inputRef.current.value = "";
      setOpen(false);
    });
  };

  return (
    <div className="mt-1 flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        autoFocus
        placeholder={t.namePlaceholder}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        className={`${fieldClass} w-full py-1 text-xs`}
      />
      <button type="button" disabled={isPending} onClick={submit} className={`${linkClass} shrink-0 text-xs`}>
        {common.save}
      </button>
      <button type="button" onClick={() => setOpen(false)} className={`${linkClass} shrink-0 text-xs`}>
        {common.cancel}
      </button>
    </div>
  );
}
