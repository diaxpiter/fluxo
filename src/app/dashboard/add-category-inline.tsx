"use client";

import { useRef, useState } from "react";
import { addCategory } from "@/app/dashboard/actions";
import { fieldClass, linkClass } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionary";

export function AddCategoryInline({
  t,
  common,
}: {
  t: Dictionary["addCategory"];
  common: Dictionary["common"];
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${linkClass} mt-1 self-start text-xs`}>
        {t.newCategory}
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
        placeholder={t.namePlaceholder}
        className={`${fieldClass} w-full py-1 text-xs`}
      />
      <button type="submit" className={`${linkClass} shrink-0 text-xs`}>
        {common.save}
      </button>
      <button type="button" onClick={() => setOpen(false)} className={`${linkClass} shrink-0 text-xs`}>
        {common.cancel}
      </button>
    </form>
  );
}
