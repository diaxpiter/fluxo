"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_WIDGETS } from "@/lib/widgets";

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

  const widgets = DEFAULT_WIDGETS.map((w) => ({
    key: w.key,
    title: (formData.get(`title_${w.key}`) as string)?.trim() || w.title,
    visible: formData.get(`visible_${w.key}`) === "on",
  }));

  await supabase.from("profiles").update({ widgets }).eq("id", user.id);

  revalidatePath("/dashboard");
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
