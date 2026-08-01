"use client";

import { useState } from "react";
import { updateStartingBalance } from "@/app/dashboard/actions";
import { fieldClass, linkClass } from "@/lib/ui";

export function StartingBalanceEditor({
  accountId,
  startingBalance,
}: {
  accountId: string;
  startingBalance: number;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className={`${linkClass} text-xs`}>
        Edit starting balance
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
        Save
      </button>
      <button type="button" onClick={() => setEditing(false)} className={`${linkClass} text-xs`}>
        Cancel
      </button>
    </form>
  );
}
