"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { WidgetKey, WidgetPref } from "@/lib/widgets";
import { parseWorkbook, type MonthCheck } from "@/lib/import-excel";
import { getDictionary, getLocale } from "@/lib/i18n/dictionary";
import { format } from "@/lib/i18n/format";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/locales";
import { accountDisplayName } from "@/lib/dashboard-data";
import { computeAllocation } from "@/lib/allocation";
import { SPACE_COOKIE, getCurrentSpace, getSpaces } from "@/lib/spaces";
import type { Account, AllocationRule, BillRecurrenceType, Category, Space } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Resolves a client-submitted id to itself only if it actually belongs to the current space.
 * category_id/recurring_bill_id/income_source_id are plain FKs -- without this, a tampered (or
 * stale, e.g. left over from a different space) request could attach a transaction to a
 * category/bill/income source outside the space it's being added to. RLS enforces the same
 * space-membership boundary at the database level (0016_space_sharing.sql); this narrows it
 * further to *this* space and fails soft (drops the id) instead of erroring the whole request.
 */
async function ownedId(
  supabase: SupabaseClient,
  table: "categories" | "recurring_bills" | "income_sources",
  id: FormDataEntryValue | null,
  spaceId: string,
): Promise<string | null> {
  if (!id) return null;
  const { data } = await supabase.from(table).select("id").eq("id", id).eq("space_id", spaceId).single();
  return data?.id ?? null;
}

function signedAmount(formData: FormData) {
  const magnitude = Math.abs(Number(formData.get("amount")));
  const direction = formData.get("direction");
  return direction === "out" ? -magnitude : magnitude;
}

export async function addTransaction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const { currentSpace } = await getCurrentSpace(supabase, user.id);
  const categoryId = await ownedId(supabase, "categories", formData.get("categoryId"), currentSpace.id);

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id: formData.get("accountId"),
    category_id: categoryId,
    date: formData.get("date"),
    description: formData.get("description"),
    amount: signedAmount(formData),
  });
  if (error) return { ok: false, error: t.errorToast };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  return { ok: true };
}

export async function updateTransaction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const dict = getDictionary(await getLocale());
  if (!user) return { ok: false, error: dict.common.errorToast };

  const { currentSpace } = await getCurrentSpace(supabase, user.id);

  const id = formData.get("id");
  const { data: existing } = await supabase
    .from("transactions")
    .select("transfer_group_id, recurring_bill_id, income_source_id")
    .eq("id", id)
    .single();

  // Editing one leg of a transfer (or a bill/income-linked row) in place would desync it from
  // its pair / from the "already paid this month" tracking -- delete and re-add instead.
  if (existing?.transfer_group_id || existing?.recurring_bill_id || existing?.income_source_id) {
    return { ok: false, error: dict.transactionList.linkedEditError };
  }

  const categoryId = await ownedId(supabase, "categories", formData.get("categoryId"), currentSpace.id);

  const { error } = await supabase
    .from("transactions")
    .update({
      category_id: categoryId,
      date: formData.get("date"),
      description: formData.get("description"),
      amount: signedAmount(formData),
    })
    .eq("id", id);
  if (error) return { ok: false, error: dict.common.errorToast };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  return { ok: true };
}

export async function deleteTransaction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const id = formData.get("id");
  const { data: transaction } = await supabase.from("transactions").select("transfer_group_id").eq("id", id).single();

  const { error } = transaction?.transfer_group_id
    // Delete both legs of the transfer together so the ledgers never go out of sync.
    ? await supabase.from("transactions").delete().eq("transfer_group_id", transaction.transfer_group_id)
    : await supabase.from("transactions").delete().eq("id", id);
  if (error) return { ok: false, error: t.errorToast };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  return { ok: true };
}

export async function deleteTransactions(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const ids = formData.getAll("id").map(String).filter(Boolean);
  if (ids.length === 0) return { ok: true };

  const { data: selected } = await supabase.from("transactions").select("id, transfer_group_id").in("id", ids);
  const transferGroupIds = [...new Set((selected ?? []).flatMap((r) => (r.transfer_group_id ? [r.transfer_group_id] : [])))];
  const plainIds = (selected ?? []).filter((r) => !r.transfer_group_id).map((r) => r.id);

  const [plainResult, transferResult] = await Promise.all([
    plainIds.length ? supabase.from("transactions").delete().in("id", plainIds) : Promise.resolve({ error: null }),
    // Delete every leg of any selected transfer together so the ledgers never go out of sync.
    transferGroupIds.length
      ? supabase.from("transactions").delete().in("transfer_group_id", transferGroupIds)
      : Promise.resolve({ error: null }),
  ]);
  if (plainResult.error || transferResult.error) return { ok: false, error: t.errorToast };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  return { ok: true };
}

export async function updateStartingBalance(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const { error } = await supabase
    .from("accounts")
    .update({ starting_balance: Number(formData.get("startingBalance")) })
    .eq("id", formData.get("accountId"));
  if (error) return { ok: false, error: t.errorToast };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function updateLanguage(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const language = formData.get("language") as string | null;
  if (!isLocale(language)) return { ok: false, error: t.errorToast };

  const { error } = await supabase.from("profiles").update({ language }).eq("id", user.id);
  if (error) return { ok: false, error: t.errorToast };

  // Keeps auth user_metadata.language in step with profiles.language -- Supabase's own
  // confirmation/recovery email templates key off .Data.language, which only sees
  // user_metadata, not the profiles table.
  await supabase.auth.updateUser({ data: { language } });

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, language, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function updateWidgetPrefs(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const orderedKeys = formData.getAll("order") as WidgetKey[];
  const widgets: WidgetPref[] = orderedKeys.map((key) => ({
    key,
    visible: formData.get(`visible_${key}`) === "on",
    wide: formData.get(`wide_${key}`) === "on",
  }));

  const { currentSpace } = await getCurrentSpace(supabase, user.id);
  const { error } = await supabase.from("spaces").update({ widgets }).eq("id", currentSpace.id);
  if (error) return { ok: false, error: t.errorToast };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export type ImportResult =
  | {
      ok: true;
      insertedCount: number;
      skippedCount: number;
      startingBalance: number;
      startingBalanceKnown: boolean;
      /** False when a balance column was present but this wasn't the account's first import -- see below. */
      startingBalanceApplied: boolean;
      monthChecks: MonthCheck[];
    }
  | { ok: false; error: string };

export async function importTransactions(formData: FormData): Promise<ImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.importTransactions;
  if (!user) return { ok: false, error: dict.common.errorToast };

  const accountId = formData.get("accountId") as string;
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: t.noFileSelected };

  let parsed;
  try {
    const buffer = await file.arrayBuffer();
    parsed = parseWorkbook(buffer, locale);
  } catch {
    return { ok: false, error: t.invalidFile };
  }

  if (parsed.transactions.length === 0) {
    return { ok: false, error: t.noTransactionsFound };
  }

  // A balance column only reflects this account's true inception balance on its FIRST
  // import -- a later statement's balance column describes a mid-history snapshot, not
  // the starting point, and must never overwrite it.
  const { count: existingCount } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId);
  const isFirstImportForAccount = (existingCount ?? 0) === 0;

  const { error: insertError } = await supabase.from("transactions").insert(
    parsed.transactions.map((row) => ({
      user_id: user.id,
      account_id: accountId,
      category_id: null,
      date: row.date,
      description: row.description,
      amount: row.amount,
    })),
  );
  if (insertError) return { ok: false, error: dict.common.errorToast };

  // Only touch starting_balance after the transactions themselves are safely in --
  // never leave the account's balance changed if nothing was actually imported.
  let startingBalanceApplied = false;
  if (parsed.startingBalanceKnown && isFirstImportForAccount) {
    const { error: balanceError } = await supabase
      .from("accounts")
      .update({ starting_balance: parsed.startingBalance })
      .eq("id", accountId);
    startingBalanceApplied = !balanceError;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");

  return {
    ok: true,
    insertedCount: parsed.transactions.length,
    skippedCount: parsed.skippedCount,
    startingBalance: parsed.startingBalance,
    startingBalanceKnown: parsed.startingBalanceKnown,
    startingBalanceApplied,
    monthChecks: parsed.monthChecks,
  };
}

function recurringBillFields(formData: FormData) {
  const isVariable = formData.get("isVariable") === "on";
  const amountValue = Math.abs(Number(formData.get("amount")));
  const categoryId = formData.get("categoryId");
  const recurrenceType = (formData.get("recurrenceType") as BillRecurrenceType) || "monthly";

  return {
    name: (formData.get("name") as string)?.trim(),
    is_variable: isVariable,
    amount: isVariable ? null : amountValue,
    estimated_amount: isVariable ? amountValue : null,
    recurrence_type: recurrenceType,
    due_day_of_month:
      recurrenceType === "monthly" || recurrenceType === "yearly" ? Number(formData.get("dueDayOfMonth")) : null,
    due_day_of_week:
      recurrenceType === "weekly" || recurrenceType === "biweekly" ? Number(formData.get("dueDayOfWeek")) : null,
    due_month: recurrenceType === "yearly" ? Number(formData.get("dueMonth")) : null,
    anchor_date: recurrenceType === "biweekly" ? (formData.get("anchorDate") as string) : null,
    account_id: formData.get("accountId"),
    category_id: categoryId ? categoryId : null,
    is_active: formData.get("isActive") === "on",
  };
}

export async function addRecurringBill(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const { currentSpace } = await getCurrentSpace(supabase, user.id);

  const { error } = await supabase.from("recurring_bills").insert({
    user_id: user.id,
    space_id: currentSpace.id,
    ...recurringBillFields(formData),
  });
  if (error) return { ok: false, error: t.errorToast };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function updateRecurringBill(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const { error } = await supabase
    .from("recurring_bills")
    .update(recurringBillFields(formData))
    .eq("id", formData.get("id"));
  if (error) return { ok: false, error: t.errorToast };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function deleteRecurringBill(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const { error } = await supabase.from("recurring_bills").delete().eq("id", formData.get("id"));
  if (error) return { ok: false, error: t.errorToast };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function payRecurringBill(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const { currentSpace } = await getCurrentSpace(supabase, user.id);
  const categoryId = await ownedId(supabase, "categories", formData.get("categoryId"), currentSpace.id);
  const billId = await ownedId(supabase, "recurring_bills", formData.get("billId"), currentSpace.id);
  if (!billId) return { ok: false, error: t.errorToast };
  const magnitude = Math.abs(Number(formData.get("amount")));
  if (!magnitude) return { ok: false, error: t.errorToast };

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id: formData.get("accountId"),
    category_id: categoryId,
    date: formData.get("date"),
    description: formData.get("description"),
    amount: -magnitude,
    recurring_bill_id: billId,
  });
  if (error) return { ok: false, error: t.errorToast };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

function incomeSourceFields(formData: FormData) {
  const scheduleType = formData.get("scheduleType") === "irregular" ? "irregular" : "fixed_monthly_date";
  const isVariable = formData.get("isVariable") === "on";
  const amountRaw = formData.get("expectedAmount") as string | null;
  const amountValue = amountRaw ? Math.abs(Number(amountRaw)) : null;
  const categoryId = formData.get("categoryId");

  return {
    name: (formData.get("name") as string)?.trim(),
    schedule_type: scheduleType,
    day_of_month: scheduleType === "fixed_monthly_date" ? Number(formData.get("dayOfMonth")) : null,
    weekend_holiday_rule: (formData.get("weekendShift") as string) || "none",
    is_variable: isVariable,
    expected_amount: isVariable ? null : amountValue,
    estimated_amount: isVariable ? amountValue : null,
    account_id: formData.get("accountId"),
    category_id: categoryId ? categoryId : null,
    is_active: formData.get("isActive") === "on",
  };
}

export async function addIncomeSource(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const { currentSpace } = await getCurrentSpace(supabase, user.id);

  const { error } = await supabase.from("income_sources").insert({
    user_id: user.id,
    space_id: currentSpace.id,
    ...incomeSourceFields(formData),
  });
  if (error) return { ok: false, error: t.errorToast };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function updateIncomeSource(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const { error } = await supabase
    .from("income_sources")
    .update(incomeSourceFields(formData))
    .eq("id", formData.get("id"));
  if (error) return { ok: false, error: t.errorToast };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function deleteIncomeSource(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const { error } = await supabase.from("income_sources").delete().eq("id", formData.get("id"));
  if (error) return { ok: false, error: t.errorToast };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function receiveIncomeSource(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale());
  if (!user) return { ok: false, error: t.common.errorToast };

  const { currentSpace } = await getCurrentSpace(supabase, user.id);
  const categoryId = await ownedId(supabase, "categories", formData.get("categoryId"), currentSpace.id);
  const sourceId = await ownedId(supabase, "income_sources", formData.get("sourceId"), currentSpace.id);
  if (!sourceId) return { ok: false, error: t.common.errorToast };
  const accountId = formData.get("accountId") as string;
  const magnitude = Math.abs(Number(formData.get("amount")));
  if (!magnitude) return { ok: false, error: t.common.errorToast };
  const date = formData.get("date");

  const rows: Record<string, unknown>[] = [
    {
      user_id: user.id,
      account_id: accountId,
      category_id: categoryId,
      date,
      description: formData.get("description"),
      amount: magnitude,
      income_source_id: sourceId,
    },
  ];

  // Recompute the allocation server-side from the current rules -- never trust a
  // client-submitted breakdown, the client preview is display-only. Scoped to the current
  // space, not just this user: a user with more than one space (e.g. "Personal" and a shared
  // "Ring & Co") must never have one space's allocation rules or accounts applied to income
  // received in the other.
  const [{ data: rules }, { data: accounts }] = await Promise.all([
    supabase.from("allocation_rules").select("*").eq("space_id", currentSpace.id).eq("is_active", true),
    supabase.from("accounts").select("*").eq("space_id", currentSpace.id),
  ]);

  const accountList = (accounts as Account[] | null) ?? [];
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

  const { error } = await supabase.from("transactions").insert(rows);
  if (error) return { ok: false, error: t.common.errorToast };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

function accountFields(formData: FormData) {
  return {
    name: (formData.get("name") as string)?.trim(),
    type: (formData.get("type") as string) || "checking",
    include_in_overview: formData.get("includeInOverview") === "on",
  };
}

export async function addAccount(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const { currentSpace } = await getCurrentSpace(supabase, user.id);

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    space_id: currentSpace.id,
    starting_balance: Number(formData.get("startingBalance")) || 0,
    ...accountFields(formData),
  });
  if (error) return { ok: false, error: t.errorToast };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function updateAccount(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const { error } = await supabase
    .from("accounts")
    .update(accountFields(formData))
    .eq("id", formData.get("id"));
  if (error) return { ok: false, error: t.errorToast };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function archiveAccount(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const id = formData.get("id");
  const { error } = await supabase.from("accounts").update({ is_archived: true }).eq("id", id);
  if (error) return { ok: false, error: t.errorToast };

  // An archived account should stop generating new obligations -- otherwise its bills/income
  // keep contributing to widgets and "mark as paid"/"receive" can still deposit into an
  // account the user thought was retired.
  await Promise.all([
    supabase.from("recurring_bills").update({ is_active: false }).eq("account_id", id),
    supabase.from("income_sources").update({ is_active: false }).eq("account_id", id),
    supabase.from("allocation_rules").update({ is_active: false }).eq("target_account_id", id),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export type TransferResult = { ok: true } | { ok: false; error: string };

export async function transferBetweenAccounts(formData: FormData): Promise<TransferResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale());
  if (!user) return { ok: false, error: t.common.errorToast };

  const fromAccountId = formData.get("fromAccountId") as string;
  const toAccountId = formData.get("toAccountId") as string;
  if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
    return { ok: false, error: t.transfer.sameAccountError };
  }

  const { data: accounts } = await supabase.from("accounts").select("*").in("id", [fromAccountId, toAccountId]);

  const fromAccount = (accounts as Account[] | null)?.find((a) => a.id === fromAccountId);
  const toAccount = (accounts as Account[] | null)?.find((a) => a.id === toAccountId);
  // Also guards against transferring between two different spaces' accounts -- each space is
  // meant to be a fully separate ledger, so this shouldn't be reachable via the UI, but nothing
  // previously stopped a tampered request from mixing them.
  if (!fromAccount || !toAccount || fromAccount.space_id !== toAccount.space_id) {
    return { ok: false, error: t.transfer.sameAccountError };
  }

  const magnitude = Math.abs(Number(formData.get("amount")));
  if (!magnitude) return { ok: false, error: t.common.errorToast };
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

  if (error) return { ok: false, error: t.common.errorToast };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");

  return { ok: true };
}

function allocationRuleFields(formData: FormData) {
  const method = formData.get("method") as string;
  const valueRaw = formData.get("value") as string | null;
  const magnitude = Math.abs(Number(valueRaw));

  return {
    target_account_id: formData.get("targetAccountId"),
    method,
    // A percentage rule beyond 100 can never mean anything (there's nothing left to give more
    // than "all of it"); clamp rather than silently let computeAllocation's own remaining-clamp
    // absorb the overshoot with no feedback that the stated number was never really honored.
    value: method === "remainder" ? null : method === "percentage" ? Math.min(magnitude, 100) : magnitude,
    is_active: formData.get("isActive") === "on",
  };
}

export async function addAllocationRule(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const { currentSpace } = await getCurrentSpace(supabase, user.id);

  const { count } = await supabase
    .from("allocation_rules")
    .select("id", { count: "exact", head: true })
    .eq("space_id", currentSpace.id);

  const { error } = await supabase.from("allocation_rules").insert({
    user_id: user.id,
    space_id: currentSpace.id,
    priority_order: count ?? 0,
    ...allocationRuleFields(formData),
  });
  if (error) return { ok: false, error: t.errorToast };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function updateAllocationRule(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const { error } = await supabase
    .from("allocation_rules")
    .update(allocationRuleFields(formData))
    .eq("id", formData.get("id"));
  if (error) return { ok: false, error: t.errorToast };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function deleteAllocationRule(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const { error } = await supabase.from("allocation_rules").delete().eq("id", formData.get("id"));
  if (error) return { ok: false, error: t.errorToast };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function updateAllocationRuleOrder(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const orderedIds = formData.getAll("order") as string[];
  const results = await Promise.all(
    orderedIds.map((id, index) => supabase.from("allocation_rules").update({ priority_order: index }).eq("id", id)),
  );
  if (results.some((r) => r.error)) return { ok: false, error: t.errorToast };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function addCategory(formData: FormData): Promise<Category | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const name = (formData.get("name") as string)?.trim();
  if (!name) return null;

  const { currentSpace } = await getCurrentSpace(supabase, user.id);

  // Reuse an existing category with the same name (case-insensitive) instead of creating a
  // silent duplicate that would fragment that category's spend across two indistinguishable rows.
  const { data: existing } = await supabase
    .from("categories")
    .select()
    .eq("user_id", user.id)
    .eq("space_id", currentSpace.id)
    .ilike("name", name)
    .maybeSingle();
  if (existing) return existing as Category;

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: user.id,
      space_id: currentSpace.id,
      name,
      kind: "other",
    })
    .select()
    .single();

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/settings");

  if (error) return null;
  return data as Category;
}

/** The literal English seed names the signup trigger inserts for a brand-new space (see 0002_ledger.sql / 0013_spaces.sql). */
const STARTER_CATEGORIES = [
  { name: "Income", kind: "income" },
  { name: "Housing", kind: "fixed_bill" },
  { name: "Utilities", kind: "fixed_bill" },
  { name: "Subscriptions", kind: "fixed_bill" },
  { name: "Savings", kind: "savings" },
  { name: "Discretionary", kind: "discretionary" },
  { name: "Other", kind: "other" },
];

export async function switchSpace(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const spaceId = formData.get("spaceId") as string;
  // getSpaces (not a raw RLS-filtered query) on purpose: RLS's own "select" policy also lets a
  // *pending* invitee preview the space they've been invited to, which must not be enough to
  // actually switch into and start editing it before they've accepted.
  const spaces = await getSpaces(supabase, user.id);
  if (!spaces.some((s) => s.id === spaceId)) return { ok: false, error: t.errorToast };

  const cookieStore = await cookies();
  cookieStore.set(SPACE_COOKIE, spaceId, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export type AddSpaceResult = { ok: true; space: Space } | { ok: false; error: string };

export async function addSpace(formData: FormData): Promise<AddSpaceResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { ok: false, error: t.errorToast };
  const color = (formData.get("color") as string) || "#10b981";

  const { data: space, error } = await supabase
    .from("spaces")
    .insert({ user_id: user.id, name, color })
    .select()
    .single();
  if (error || !space) return { ok: false, error: t.errorToast };

  // Every space starts with its own Main Account + starter categories, same as a new signup.
  const [{ error: accountError }, { error: categoriesError }] = await Promise.all([
    supabase.from("accounts").insert({
      user_id: user.id,
      space_id: space.id,
      name: "Main Account",
      type: "checking",
    }),
    supabase
      .from("categories")
      .insert(STARTER_CATEGORIES.map((c) => ({ user_id: user.id, space_id: space.id, name: c.name, kind: c.kind }))),
  ]);
  if (accountError || categoriesError) return { ok: false, error: t.errorToast };

  const cookieStore = await cookies();
  cookieStore.set(SPACE_COOKIE, space.id, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/settings");

  return { ok: true, space: space as Space };
}

export async function updateSpace(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { ok: false, error: t.errorToast };
  const color = (formData.get("color") as string) || "#10b981";

  // No owner-only filter: an accepted member can rename/re-color a shared space too, per the
  // equal-collaborator model -- RLS (0016_space_sharing.sql) enforces that boundary.
  const { error } = await supabase.from("spaces").update({ name, color }).eq("id", formData.get("id"));
  if (error) return { ok: false, error: t.errorToast };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export type DeleteSpaceResult = { ok: true } | { ok: false; error: string };

export async function deleteSpace(formData: FormData): Promise<DeleteSpaceResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale());
  if (!user) return { ok: false, error: t.common.errorToast };

  const spaceId = formData.get("id") as string;

  // Deleting a space stays owner-only (see below), but the "you need at least one space" guard
  // checks every space the user can currently reach -- owned or a member of -- since a member
  // space is just as valid a place to land after deleting an owned one.
  const spaces = await getSpaces(supabase, user.id);
  if (spaces.length <= 1) {
    return { ok: false, error: t.spaces.lastSpaceError };
  }

  const { error } = await supabase.from("spaces").delete().eq("id", spaceId).eq("user_id", user.id);
  if (error) return { ok: false, error: t.common.errorToast };

  // If the deleted space was the current one, fall back to whichever one is left.
  const cookieStore = await cookies();
  if (cookieStore.get(SPACE_COOKIE)?.value === spaceId) {
    const remaining = spaces.find((s) => s.id !== spaceId);
    if (remaining) cookieStore.set(SPACE_COOKIE, remaining.id, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/settings");

  return { ok: true };
}

export async function inviteMember(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale());
  if (!user) return { ok: false, error: t.common.errorToast };

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  if (!email) return { ok: false, error: t.common.errorToast };
  if (email === user.email?.toLowerCase()) return { ok: false, error: t.spaces.inviteSelfError };

  const { currentSpace } = await getCurrentSpace(supabase, user.id);
  if (!currentSpace.isOwner) return { ok: false, error: t.spaces.inviteNotOwnerError };

  const { error } = await supabase.from("space_members").insert({
    space_id: currentSpace.id,
    invited_email: email,
    invited_by: user.id,
  });
  if (error) {
    // Postgres unique_violation -- this email already has a pending invite or membership here.
    return { ok: false, error: error.code === "23505" ? t.spaces.inviteDuplicateError : t.common.errorToast };
  }

  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function respondToInvite(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user?.email) return { ok: false, error: t.errorToast };

  const inviteId = formData.get("inviteId") as string;
  const accept = formData.get("accept") === "true";

  const { error } = accept
    ? await supabase
        .from("space_members")
        .update({ user_id: user.id, status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", inviteId)
        .eq("invited_email", user.email)
    : await supabase.from("space_members").delete().eq("id", inviteId).eq("invited_email", user.email);
  if (error) return { ok: false, error: t.errorToast };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function removeMember(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  // Owner-only in practice: RLS's "Owner manages members or invitee accepts" policy also lets a
  // member remove themself, but this action is only wired up from the owner-facing members list
  // -- see leaveSpace for the member-facing equivalent.
  const { error } = await supabase.from("space_members").delete().eq("id", formData.get("memberId"));
  if (error) return { ok: false, error: t.errorToast };

  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function leaveSpace(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = getDictionary(await getLocale()).common;
  if (!user) return { ok: false, error: t.errorToast };

  const spaceId = formData.get("spaceId") as string;
  const { error } = await supabase.from("space_members").delete().eq("space_id", spaceId).eq("user_id", user.id);
  if (error) return { ok: false, error: t.errorToast };

  const cookieStore = await cookies();
  if (cookieStore.get(SPACE_COOKIE)?.value === spaceId) {
    const spaces = await getSpaces(supabase, user.id);
    const remaining = spaces.find((s) => s.id !== spaceId);
    if (remaining) cookieStore.set(SPACE_COOKIE, remaining.id, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}
