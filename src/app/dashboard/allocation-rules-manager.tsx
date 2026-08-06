"use client";

import { useState, useTransition } from "react";
import {
  addAllocationRule,
  updateAllocationRule,
  deleteAllocationRule,
  updateAllocationRuleOrder,
} from "@/app/dashboard/actions";
import { formatCurrency } from "@/lib/currency";
import { format } from "@/lib/i18n/format";
import {
  cardClass,
  fieldClass,
  btnPrimaryClass,
  btnGhostClass,
  btnDestructiveClass,
  linkClass,
  actionLinkClass,
} from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { accountDisplayName } from "@/lib/dashboard-data";
import { notify } from "@/lib/toast";
import type { Account, AllocationMethod, AllocationRule } from "@/lib/types";

export function AllocationRulesManager({
  rules,
  accounts,
  currency,
  locale,
  t,
}: {
  rules: AllocationRule[];
  accounts: Account[];
  currency: string;
  locale: string;
  t: Dictionary;
}) {
  const [order, setOrder] = useState<string[]>(rules.map((r) => r.id));
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();
  const byId = new Map(rules.map((r) => [r.id, r]));

  const accountName = (id: string) => {
    const account = accounts.find((a) => a.id === id);
    return account ? accountDisplayName(account, t.common.mainAccount) : "";
  };

  function move(id: string, direction: -1 | 1) {
    setOrder((prev) => {
      const i = prev.indexOf(id);
      const j = i + direction;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];

      startTransition(async () => {
        const formData = new FormData();
        next.forEach((ruleId) => formData.append("order", ruleId));
        const result = await updateAllocationRuleOrder(formData);
        if (!result.ok) notify(result.error, "error");
      });

      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {rules.length === 0 ? (
        <p className="text-sm text-foreground/50">{t.allocationRules.empty}</p>
      ) : (
        <div className={cardClass}>
          {order.map((id, i) => {
            const rule = byId.get(id);
            if (!rule) return null;
            return (
              <RuleRow
                key={id}
                rule={rule}
                accounts={accounts}
                accountName={accountName(rule.target_account_id)}
                currency={currency}
                locale={locale}
                t={t}
                onMoveUp={() => move(id, -1)}
                onMoveDown={() => move(id, 1)}
                canMoveUp={i > 0}
                canMoveDown={i < order.length - 1}
              />
            );
          })}
        </div>
      )}

      {adding ? (
        <RuleForm accounts={accounts} t={t} onDone={() => setAdding(false)} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={`${linkClass} self-start text-xs`}>
          {t.allocationRules.addButton}
        </button>
      )}
    </div>
  );
}

function RuleRow({
  rule,
  accounts,
  accountName,
  currency,
  locale,
  t,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  rule: AllocationRule;
  accounts: Account[];
  accountName: string;
  currency: string;
  locale: string;
  t: Dictionary;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="border-b border-foreground/5 bg-foreground/[0.03] p-4 last:border-0">
        <RuleForm rule={rule} accounts={accounts} t={t} onDone={() => setEditing(false)} />
      </div>
    );
  }

  const methodLabel =
    rule.method === "fixed_amount"
      ? t.allocationRules.methodFixedAmount
      : rule.method === "percentage"
        ? t.allocationRules.methodPercentage
        : t.allocationRules.methodRemainder;

  const valueText =
    rule.method === "fixed_amount"
      ? formatCurrency(rule.value ?? 0, currency, locale)
      : rule.method === "percentage"
        ? `${rule.value ?? 0}%`
        : "";

  return (
    <div className="border-b border-foreground/5 p-4 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{accountName}</p>
        <p className="mt-0.5 truncate text-xs text-foreground/50">
          {methodLabel}
          {valueText ? ` · ${valueText}` : ""}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <form
          action={async (formData) => {
            const result = await updateAllocationRule(formData);
            notify(result.ok ? t.common.savedToast : result.error, result.ok ? "success" : "error");
          }}
          onChange={(e) => e.currentTarget.requestSubmit()}
        >
          <input type="hidden" name="id" value={rule.id} />
          <input type="hidden" name="targetAccountId" value={rule.target_account_id} />
          <input type="hidden" name="method" value={rule.method} />
          <input type="hidden" name="value" value={rule.value ?? ""} />
          <label className="flex items-center gap-1.5 text-foreground/50">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={rule.is_active}
              className="h-3.5 w-3.5 cursor-pointer rounded border-foreground/30 accent-emerald-500"
            />
            {t.recurringBills.activeLabel}
          </label>
        </form>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className={`${actionLinkClass} disabled:pointer-events-none disabled:opacity-30`}
            aria-label={format(t.widgetCustomizer.moveUp, { title: accountName })}
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className={`${actionLinkClass} disabled:pointer-events-none disabled:opacity-30`}
            aria-label={format(t.widgetCustomizer.moveDown, { title: accountName })}
          >
            ↓
          </button>
        </div>

        <button type="button" onClick={() => setEditing(true)} className={actionLinkClass}>
          {t.common.edit}
        </button>
        <DeleteRuleButton rule={rule} accountName={accountName} t={t} />
      </div>
    </div>
  );
}

function DeleteRuleButton({
  rule,
  accountName,
  t,
}: {
  rule: AllocationRule;
  accountName: string;
  t: Dictionary;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${actionLinkClass} hover:text-red-400`}>
        {t.common.delete}
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
            <h2 className="text-lg font-semibold tracking-tight">{t.allocationRules.deleteTitle}</h2>
            <p className="mt-2 text-sm text-foreground/60">
              {format(t.allocationRules.deleteBody, { account: accountName })}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setOpen(false)} className={btnGhostClass}>
                {t.common.cancel}
              </button>
              <form
                action={async (formData) => {
                  const result = await deleteAllocationRule(formData);
                  notify(result.ok ? t.common.deletedToast : result.error, result.ok ? "success" : "error");
                }}
              >
                <input type="hidden" name="id" value={rule.id} />
                <button type="submit" className={`${btnDestructiveClass} w-full`}>
                  {t.common.delete}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RuleForm({
  rule,
  accounts,
  t,
  onDone,
}: {
  rule?: AllocationRule;
  accounts: Account[];
  t: Dictionary;
  onDone: () => void;
}) {
  const [method, setMethod] = useState<AllocationMethod>(rule?.method ?? "fixed_amount");
  const action = rule ? updateAllocationRule : addAllocationRule;

  return (
    <form
      action={async (formData) => {
        const result = await action(formData);
        if (result.ok) {
          notify(t.common.savedToast);
          onDone();
        } else {
          notify(result.error, "error");
        }
      }}
      className={`${cardClass} flex flex-col gap-3 p-4`}
    >
      {rule && <input type="hidden" name="id" value={rule.id} />}

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-foreground/50">{t.allocationRules.targetAccountLabel}</label>
          <select name="targetAccountId" defaultValue={rule?.target_account_id ?? accounts[0]?.id} className={fieldClass}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {accountDisplayName(a, t.common.mainAccount)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-foreground/50">{t.allocationRules.methodLabel}</label>
          <select
            name="method"
            value={method}
            onChange={(e) => setMethod(e.target.value as AllocationMethod)}
            className={fieldClass}
          >
            <option value="fixed_amount">{t.allocationRules.methodFixedAmount}</option>
            <option value="percentage">{t.allocationRules.methodPercentage}</option>
            <option value="remainder">{t.allocationRules.methodRemainder}</option>
          </select>
        </div>

        {method !== "remainder" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-foreground/50">{t.allocationRules.valueLabel}</label>
            <input
              type="number"
              name="value"
              step="0.01"
              min="0"
              required
              defaultValue={rule?.value ?? undefined}
              className={`${fieldClass} w-28`}
            />
          </div>
        )}

        <label className="flex items-center gap-1.5 pb-2 text-xs text-foreground/50">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={rule?.is_active ?? true}
            className="h-3.5 w-3.5 cursor-pointer rounded border-foreground/30 accent-emerald-500"
          />
          {t.recurringBills.activeLabel}
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
