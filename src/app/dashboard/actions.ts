"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { WidgetKey, WidgetPref } from "@/lib/widgets";
import { parseWorkbook, type MonthCheck } from "@/lib/import-excel";
import { getDictionary, getLocale } from "@/lib/i18n/dictionary";
import { format } from "@/lib/i18n/format";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/locales";
import { accountDisplayName } from "@/lib/dashboard-data";
import { computeAllocation } from "@/lib/allocation";
import type { Account, AllocationRule } from "@/lib/types";

function signedAmount(formData: FormData) {
  const magnitude = Math.abs(Number(formData.get("amount")));
  const direction = formData.get("direction");
  return direction === "out" ? -magnitude : magnitude;
}

export async function addTransaction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const categoryId = formData.get("categoryId");

  await supabase.from("transactions").insert({
    user_id: user.id,
    account_id: formData.get("accountId"),
    category_id: categoryId ? categoryId : null,
    date: formData.get("date"),
    description: formData.get("description"),
    amount: signedAmount(formData),
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
}

export async function updateTransaction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const categoryId = formData.get("categoryId");

  await supabase
    .from("transactions")
    .update({
      category_id: categoryId ? categoryId : null,
      date: formData.get("date"),
      description: formData.get("description"),
      amount: signedAmount(formData),
    })
    .eq("id", formData.get("id"))
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
}

export async function deleteTransaction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const id = formData.get("id");
  const { data: transaction } = await supabase
    .from("transactions")
    .select("transfer_group_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (transaction?.transfer_group_id) {
    // Delete both legs of the transfer together so the ledgers never go out of sync.
    await supabase
      .from("transactions")
      .delete()
      .eq("transfer_group_id", transaction.transfer_group_id)
      .eq("user_id", user.id);
  } else {
    await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
}

export async function updateStartingBalance(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("accounts")
    .update({ starting_balance: Number(formData.get("startingBalance")) })
    .eq("id", formData.get("accountId"))
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/settings");
}

export async function updateLanguage(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const language = formData.get("language") as string | null;
  if (!isLocale(language)) return;

  await supabase.from("profiles").update({ language }).eq("id", user.id);

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, language, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/settings");
}

export async function updateWidgetPrefs(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const orderedKeys = formData.getAll("order") as WidgetKey[];
  const widgets: WidgetPref[] = orderedKeys.map((key) => ({
    key,
    visible: formData.get(`visible_${key}`) === "on",
    wide: formData.get(`wide_${key}`) === "on",
  }));

  await supabase.from("profiles").update({ widgets }).eq("id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export type ImportResult =
  | { ok: true; insertedCount: number; startingBalance: number; monthChecks: MonthCheck[] }
  | { ok: false; error: string };

export async function importTransactions(formData: FormData): Promise<ImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const t = getDictionary(await getLocale()).importTransactions;

  const accountId = formData.get("accountId") as string;
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: t.noFileSelected };

  let parsed;
  try {
    const buffer = await file.arrayBuffer();
    parsed = parseWorkbook(buffer);
  } catch {
    return { ok: false, error: t.invalidFile };
  }

  if (parsed.transactions.length === 0) {
    return { ok: false, error: t.noTransactionsFound };
  }

  const { error: balanceError } = await supabase
    .from("accounts")
    .update({ starting_balance: parsed.startingBalance })
    .eq("id", accountId)
    .eq("user_id", user.id);
  if (balanceError) return { ok: false, error: balanceError.message };

  const { error: insertError } = await supabase.from("transactions").insert(
    parsed.transactions.map((t) => ({
      user_id: user.id,
      account_id: accountId,
      category_id: null,
      date: t.date,
      description: t.description,
      amount: t.amount,
    })),
  );
  if (insertError) return { ok: false, error: insertError.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");

  return {
    ok: true,
    insertedCount: parsed.transactions.length,
    startingBalance: parsed.startingBalance,
    monthChecks: parsed.monthChecks,
  };
}

function recurringBillFields(formData: FormData) {
  const isVariable = formData.get("isVariable") === "on";
  const amountValue = Math.abs(Number(formData.get("amount")));
  const categoryId = formData.get("categoryId");

  return {
    name: (formData.get("name") as string)?.trim(),
    is_variable: isVariable,
    amount: isVariable ? null : amountValue,
    estimated_amount: isVariable ? amountValue : null,
    due_day_of_month: Number(formData.get("dueDayOfMonth")),
    account_id: formData.get("accountId"),
    category_id: categoryId ? categoryId : null,
    is_active: formData.get("isActive") === "on",
  };
}

export async function addRecurringBill(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("recurring_bills").insert({
    user_id: user.id,
    ...recurringBillFields(formData),
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function updateRecurringBill(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("recurring_bills")
    .update(recurringBillFields(formData))
    .eq("id", formData.get("id"))
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function deleteRecurringBill(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("recurring_bills").delete().eq("id", formData.get("id")).eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function payRecurringBill(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const categoryId = formData.get("categoryId");
  const magnitude = Math.abs(Number(formData.get("amount")));

  await supabase.from("transactions").insert({
    user_id: user.id,
    account_id: formData.get("accountId"),
    category_id: categoryId ? categoryId : null,
    date: formData.get("date"),
    description: formData.get("description"),
    amount: -magnitude,
    recurring_bill_id: formData.get("billId"),
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/settings");
}

function incomeSourceFields(formData: FormData) {
  const scheduleType = formData.get("scheduleType") === "irregular" ? "irregular" : "fixed_monthly_date";
  const expectedAmountRaw = formData.get("expectedAmount") as string | null;
  const categoryId = formData.get("categoryId");

  return {
    name: (formData.get("name") as string)?.trim(),
    schedule_type: scheduleType,
    day_of_month: scheduleType === "fixed_monthly_date" ? Number(formData.get("dayOfMonth")) : null,
    weekend_holiday_rule: (formData.get("weekendShift") as string) || "none",
    expected_amount: expectedAmountRaw ? Math.abs(Number(expectedAmountRaw)) : null,
    account_id: formData.get("accountId"),
    category_id: categoryId ? categoryId : null,
    is_active: formData.get("isActive") === "on",
  };
}

export async function addIncomeSource(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("income_sources").insert({
    user_id: user.id,
    ...incomeSourceFields(formData),
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function updateIncomeSource(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("income_sources")
    .update(incomeSourceFields(formData))
    .eq("id", formData.get("id"))
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function deleteIncomeSource(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("income_sources").delete().eq("id", formData.get("id")).eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function receiveIncomeSource(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const categoryId = formData.get("categoryId");
  const accountId = formData.get("accountId") as string;
  const magnitude = Math.abs(Number(formData.get("amount")));
  const date = formData.get("date");

  const rows: Record<string, unknown>[] = [
    {
      user_id: user.id,
      account_id: accountId,
      category_id: categoryId ? categoryId : null,
      date,
      description: formData.get("description"),
      amount: magnitude,
      income_source_id: formData.get("sourceId"),
    },
  ];

  // Recompute the allocation server-side from the current rules -- never trust
  // a client-submitted breakdown, the client preview is display-only.
  const [{ data: rules }, { data: accounts }] = await Promise.all([
    supabase.from("allocation_rules").select("*").eq("user_id", user.id).eq("is_active", true),
    supabase.from("accounts").select("*").eq("user_id", user.id),
  ]);

  const accountList = (accounts as Account[] | null) ?? [];
  const t = getDictionary(await getLocale());
  const sourceAccount = accountList.find((a) => a.id === accountId);
  const sourceName = sourceAccount ? accountDisplayName(sourceAccount, t.common.mainAccount) : "";

  const lines = computeAllocation(magnitude, (rules as AllocationRule[] | null) ?? []);
  for (const line of lines) {
    if (line.targetAccountId === accountId) continue; // stays put, no transfer needed
    const targetAccount = accountList.find((a) => a.id === line.targetAccountId);
    if (!targetAccount) continue; // rule points at an account that's gone/not ours

    const transferGroupId = crypto.randomUUID();
    const targetName = accountDisplayName(targetAccount, t.common.mainAccount);

    rows.push(
      {
        user_id: user.id,
        account_id: accountId,
        category_id: null,
        date,
        description: format(t.transfer.toDescription, { name: targetName }),
        amount: -line.amount,
        transfer_group_id: transferGroupId,
      },
      {
        user_id: user.id,
        account_id: line.targetAccountId,
        category_id: null,
        date,
        description: format(t.transfer.fromDescription, { name: sourceName }),
        amount: line.amount,
        transfer_group_id: transferGroupId,
      },
    );
  }

  await supabase.from("transactions").insert(rows);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/settings");
}

function accountFields(formData: FormData) {
  return {
    name: (formData.get("name") as string)?.trim(),
    type: (formData.get("type") as string) || "checking",
    include_in_overview: formData.get("includeInOverview") === "on",
  };
}

export async function addAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("accounts").insert({
    user_id: user.id,
    starting_balance: Number(formData.get("startingBalance")) || 0,
    ...accountFields(formData),
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/settings");
}

export async function updateAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("accounts")
    .update(accountFields(formData))
    .eq("id", formData.get("id"))
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/settings");
}

export async function archiveAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("accounts").update({ is_archived: true }).eq("id", formData.get("id")).eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/settings");
}

export type TransferResult = { ok: true } | { ok: false; error: string };

export async function transferBetweenAccounts(formData: FormData): Promise<TransferResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const t = getDictionary(await getLocale());

  const fromAccountId = formData.get("fromAccountId") as string;
  const toAccountId = formData.get("toAccountId") as string;
  if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
    return { ok: false, error: t.transfer.sameAccountError };
  }

  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .in("id", [fromAccountId, toAccountId])
    .eq("user_id", user.id);

  const fromAccount = (accounts as Account[] | null)?.find((a) => a.id === fromAccountId);
  const toAccount = (accounts as Account[] | null)?.find((a) => a.id === toAccountId);
  if (!fromAccount || !toAccount) return { ok: false, error: t.transfer.sameAccountError };

  const magnitude = Math.abs(Number(formData.get("amount")));
  const date = formData.get("date");
  const description = (formData.get("description") as string)?.trim();
  const transferGroupId = crypto.randomUUID();
  const fromName = accountDisplayName(fromAccount, t.common.mainAccount);
  const toName = accountDisplayName(toAccount, t.common.mainAccount);

  const { error } = await supabase.from("transactions").insert([
    {
      user_id: user.id,
      account_id: fromAccountId,
      category_id: null,
      date,
      description: description || format(t.transfer.toDescription, { name: toName }),
      amount: -magnitude,
      transfer_group_id: transferGroupId,
    },
    {
      user_id: user.id,
      account_id: toAccountId,
      category_id: null,
      date,
      description: description || format(t.transfer.fromDescription, { name: fromName }),
      amount: magnitude,
      transfer_group_id: transferGroupId,
    },
  ]);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");

  return { ok: true };
}

function allocationRuleFields(formData: FormData) {
  const method = formData.get("method") as string;
  const valueRaw = formData.get("value") as string | null;

  return {
    target_account_id: formData.get("targetAccountId"),
    method,
    value: method === "remainder" ? null : Math.abs(Number(valueRaw)),
    is_active: formData.get("isActive") === "on",
  };
}

export async function addAllocationRule(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { count } = await supabase
    .from("allocation_rules")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  await supabase.from("allocation_rules").insert({
    user_id: user.id,
    priority_order: count ?? 0,
    ...allocationRuleFields(formData),
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function updateAllocationRule(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("allocation_rules")
    .update(allocationRuleFields(formData))
    .eq("id", formData.get("id"))
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function deleteAllocationRule(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("allocation_rules").delete().eq("id", formData.get("id")).eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function updateAllocationRuleOrder(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const orderedIds = formData.getAll("order") as string[];
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("allocation_rules").update({ priority_order: index }).eq("id", id).eq("user_id", user.id),
    ),
  );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function addCategory(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  await supabase.from("categories").insert({
    user_id: user.id,
    name,
    kind: "other",
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
}
