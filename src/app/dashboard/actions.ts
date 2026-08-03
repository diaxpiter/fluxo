"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { WidgetKey, WidgetPref } from "@/lib/widgets";
import { parseWorkbook, type MonthCheck } from "@/lib/import-excel";
import { getDictionary, getLocale } from "@/lib/i18n/dictionary";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/locales";

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

  await supabase
    .from("transactions")
    .delete()
    .eq("id", formData.get("id"))
    .eq("user_id", user.id);

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
