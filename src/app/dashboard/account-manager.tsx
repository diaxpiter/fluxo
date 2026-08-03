"use client";

import { useState } from "react";
import { addAccount, updateAccount, archiveAccount } from "@/app/dashboard/actions";
import { StartingBalanceEditor } from "@/app/dashboard/starting-balance-editor";
import { formatCurrency } from "@/lib/currency";
import { format } from "@/lib/i18n/format";
import {
  cardClass,
  fieldClass,
  btnPrimaryClass,
  btnGhostClass,
  btnDestructiveClass,
  linkClass,
  numericClass,
} from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { accountDisplayName } from "@/lib/dashboard-data";
import type { Account, AccountType } from "@/lib/types";

const ACCOUNT_TYPES: AccountType[] = [
  "checking",
  "savings",
  "sinking_fund",
  "emergency",
  "investment",
  "shared",
  "cash",
  "other",
];

export function AccountManager({
  accounts,
  balances,
  currency,
  locale,
  t,
}: {
  accounts: Account[];
  balances: Map<string, number>;
  currency: string;
  locale: string;
  t: Dictionary;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {accounts.length === 0 ? (
        <p className="text-sm text-foreground/50">{t.accounts.empty}</p>
      ) : (
        <div className={cardClass}>
          {accounts.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              balance={balances.get(account.id) ?? account.starting_balance}
              currency={currency}
              locale={locale}
              t={t}
            />
          ))}
        </div>
      )}

      {adding ? (
        <AccountForm t={t} onDone={() => setAdding(false)} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={`${linkClass} self-start text-xs`}>
          {t.accounts.addButton}
        </button>
      )}
    </div>
  );
}

function AccountRow({
  account,
  balance,
  currency,
  locale,
  t,
}: {
  account: Account;
  balance: number;
  currency: string;
  locale: string;
  t: Dictionary;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="border-b border-foreground/5 bg-foreground/[0.03] p-4 last:border-0">
        <AccountForm account={account} t={t} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground/5 p-4 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{accountDisplayName(account, t.common.mainAccount)}</p>
        <p className="mt-0.5 truncate text-xs text-foreground/50">{t.accountTypes[account.type]}</p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <p className={`text-sm ${numericClass}`}>{formatCurrency(balance, currency, locale)}</p>

        <form action={updateAccount} onChange={(e) => e.currentTarget.requestSubmit()}>
          <input type="hidden" name="id" value={account.id} />
          <input type="hidden" name="name" value={account.name} />
          <input type="hidden" name="type" value={account.type} />
          <label className="flex items-center gap-1.5 text-xs text-foreground/50">
            <input
              type="checkbox"
              name="includeInOverview"
              defaultChecked={account.include_in_overview}
              className="h-3.5 w-3.5 cursor-pointer rounded border-foreground/30 accent-emerald-500"
            />
            {t.accounts.includeInOverviewLabel}
          </label>
        </form>

        <div className="flex items-center gap-3 text-xs">
          <StartingBalanceEditor
            accountId={account.id}
            startingBalance={account.starting_balance}
            t={t.startingBalance}
            common={t.common}
          />
          <button type="button" onClick={() => setEditing(true)} className={linkClass}>
            {t.common.edit}
          </button>
          <ArchiveButton account={account} t={t} />
        </div>
      </div>
    </div>
  );
}

function ArchiveButton({ account, t }: { account: Account; t: Dictionary }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${linkClass} hover:text-red-400`}>
        {t.accounts.archiveButton}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="animate-modal-in w-full max-w-sm rounded-2xl border border-foreground/10 bg-background p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold tracking-tight">{t.accounts.archiveTitle}</h2>
            <p className="mt-2 text-sm text-foreground/60">
              {format(t.accounts.archiveBody, { name: accountDisplayName(account, t.common.mainAccount) })}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setOpen(false)} className={btnGhostClass}>
                {t.common.cancel}
              </button>
              <form action={archiveAccount}>
                <input type="hidden" name="id" value={account.id} />
                <button type="submit" className={`${btnDestructiveClass} w-full`}>
                  {t.accounts.archiveButton}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AccountForm({ account, t, onDone }: { account?: Account; t: Dictionary; onDone: () => void }) {
  const action = account ? updateAccount : addAccount;

  return (
    <form
      action={async (formData) => {
        await action(formData);
        onDone();
      }}
      className={`${cardClass} flex flex-col gap-3 p-4`}
    >
      {account && <input type="hidden" name="id" value={account.id} />}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-foreground/50">{t.accounts.nameLabel}</label>
        <input type="text" name="name" required autoFocus defaultValue={account?.name} className={fieldClass} />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-foreground/50">{t.accounts.typeLabel}</label>
          <select name="type" defaultValue={account?.type ?? "checking"} className={fieldClass}>
            {ACCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t.accountTypes[type]}
              </option>
            ))}
          </select>
        </div>

        {!account && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-foreground/50">{t.accounts.startingBalanceLabel}</label>
            <input type="number" name="startingBalance" step="0.01" defaultValue={0} className={`${fieldClass} w-28`} />
          </div>
        )}

        <label className="flex items-center gap-1.5 pb-2 text-xs text-foreground/50">
          <input
            type="checkbox"
            name="includeInOverview"
            defaultChecked={account?.include_in_overview ?? true}
            className="h-3.5 w-3.5 cursor-pointer rounded border-foreground/30 accent-emerald-500"
          />
          {t.accounts.includeInOverviewLabel}
        </label>
      </div>

      <div className="mt-1 flex items-center gap-4">
        <button type="submit" className={`${btnPrimaryClass} px-3 py-1.5 text-xs`}>
          {t.common.save}
        </button>
        <button type="button" onClick={onDone} className={`${linkClass} text-xs`}>
          {t.common.cancel}
        </button>
      </div>
    </form>
  );
}
