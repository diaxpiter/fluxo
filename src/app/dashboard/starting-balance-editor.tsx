"use client";

import { useState } from "react";
import { updateStartingBalance } from "@/app/dashboard/actions";

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
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs text-foreground/60 underline underline-offset-4 hover:text-foreground"
      >
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
        className="w-28 rounded-md border border-foreground/15 bg-transparent px-2 py-1 text-sm outline-none focus:border-foreground/40"
      />
      <button type="submit" className="text-xs font-medium underline underline-offset-4">
        Save
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-xs text-foreground/60"
      >
        Cancel
      </button>
    </form>
  );
}
