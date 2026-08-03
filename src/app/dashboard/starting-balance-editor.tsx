"use client";

import { useState } from "react";
import { updateStartingBalance } from "@/app/dashboard/actions";
import { fieldClass, linkClass } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionary";

export function StartingBalanceEditor({
  accountId,
  startingBalance,
  t,
  common,
}: {
  accountId: string;
  startingBalance: number;
  t: Dictionary["startingBalance"];
  common: Dictionary["common"];
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className={`${linkClass} text-xs`}>
        {t.editLink}
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await updateStartingBalance(formData);
        setEditing(false);
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="accountId" value={accountId} />
      <input
        type="number"
        name="startingBalance"
        step="0.01"
        defaultValue={startingBalance}
        autoFocus
        className={`${fieldClass} w-28`}
      />
      <button type="submit" className={`${linkClass} text-xs font-medium`}>
        {common.save}
      </button>
      <button type="button" onClick={() => setEditing(false)} className={`${linkClass} text-xs`}>
        {common.cancel}
      </button>
    </form>
  );
}
