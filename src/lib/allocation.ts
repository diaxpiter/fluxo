import type { AllocationRule } from "@/lib/types";

export type AllocationLine = {
  ruleId: string;
  targetAccountId: string;
  amount: number;
};

/**
 * Splits totalAmount across active rules in priority order. Percentage rules
 * are always a percentage of the original total, not of what's left. Never
 * goes negative — if earlier rules already consumed everything, later rules
 * (including a misplaced non-last "remainder") simply compute to 0 and are
 * dropped. Whatever no rule claims just stays in the source account.
 */
export function computeAllocation(totalAmount: number, rules: AllocationRule[]): AllocationLine[] {
  const active = [...rules].filter((r) => r.is_active).sort((a, b) => a.priority_order - b.priority_order);

  let remaining = totalAmount;
  const lines: AllocationLine[] = [];

  for (const rule of active) {
    let amount: number;
    if (rule.method === "fixed_amount") amount = Math.min(rule.value ?? 0, remaining);
    else if (rule.method === "percentage") amount = Math.min((totalAmount * (rule.value ?? 0)) / 100, remaining);
    else amount = remaining;

    amount = Math.max(0, Math.round(amount * 100) / 100);
    if (amount > 0) {
      lines.push({ ruleId: rule.id, targetAccountId: rule.target_account_id, amount });
      remaining -= amount;
    }
  }

  return lines;
}
