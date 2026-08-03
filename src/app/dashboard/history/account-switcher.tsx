"use client";

import { useRouter } from "next/navigation";
import { accountDisplayName } from "@/lib/dashboard-data";
import { fieldClass } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Account } from "@/lib/types";

export function AccountSwitcher({
  accounts,
  selectedId,
  t,
}: {
  accounts: Account[];
  selectedId: string;
  t: Dictionary["common"];
}) {
  const router = useRouter();

  if (accounts.length < 2) return null;

  return (
    <select
      value={selectedId}
      onChange={(e) => router.push(`/dashboard/history?account=${e.target.value}`)}
      className={`${fieldClass} w-auto py-1.5 text-sm`}
    >
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>
          {accountDisplayName(a, t.mainAccount)}
        </option>
      ))}
    </select>
  );
}
