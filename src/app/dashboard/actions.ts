"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_WIDGETS } from "@/lib/widgets";
import { parseWorkbook, type MonthCheck } from "@/lib/import-excel";

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
}

export async function updateWidgetPrefs(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const orderedKeys = formData.getAll("order") as string[];
  const widgets = orderedKeys.map((key) => {
    const fallback = DEFAULT_WIDGETS.find((w) => w.key === key);
    const tier = Number(formData.get(`tier_${key}`));
    return {
      key,
      title: (formData.get(`title_${key}`) as string)?.trim() || fallback?.title || key,
      visible: formData.get(`visible_${key}`) === "on",
      tier: Number.isFinite(tier) && tier > 0 ? tier : (fallback?.tier ?? 1),
    };
  });

  await supabase.from("profiles").update({ widgets }).eq("id", user.id);

  revalidatePath("/dashboard");
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

  const accountId = formData.get("accountId") as string;
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "No file selected." };

  let parsed;
  try {
    const buffer = await file.arrayBuffer();
    parsed = parseWorkbook(buffer);
  } catch {
    return { ok: false, error: "Couldn't read that file — is it a valid .xlsx workbook?" };
  }

  if (parsed.transactions.length === 0) {
    return { ok: false, error: "No transactions found in that file." };
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
}
