"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { orderedSetAsides, type OnboardingAnswers, type PresetBillCategoryKey } from "@/lib/onboarding";
import type { Category } from "@/lib/types";

/** The literal English seed names inserted by the signup trigger (see 0002_ledger.sql). */
const CATEGORY_KEY_TO_SEED_NAME: Record<PresetBillCategoryKey, string> = {
  housing: "Housing",
  utilities: "Utilities",
  subscriptions: "Subscriptions",
  other: "Other",
};

function clampDayOfMonth(day: number | null): number | null {
  if (day == null || Number.isNaN(day)) return null;
  return Math.min(31, Math.max(1, Math.round(day)));
}

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const mainAccountId = formData.get("mainAccountId") as string;

  let answers: OnboardingAnswers;
  try {
    answers = JSON.parse(formData.get("answers") as string);
  } catch {
    return;
  }

  // The signup trigger already created exactly one space for this brand-new user.
  const { data: space } = await supabase.from("spaces").select("id").eq("user_id", user.id).single();
  const spaceId = space!.id;

  const { data: categories } = await supabase.from("categories").select("*").eq("user_id", user.id);
  const categoryList = (categories as Category[] | null) ?? [];
  const categoryIdFor = (key: PresetBillCategoryKey) =>
    categoryList.find((c) => c.name === CATEGORY_KEY_TO_SEED_NAME[key])?.id ?? null;

  // 1. Rename the seeded Main Account + set its starting balance.
  const [mainDayToDay, ...extraDayToDay] = answers.dayToDayAccounts;
  await supabase
    .from("accounts")
    .update({
      name: mainDayToDay?.name?.trim() || "Main Account",
      starting_balance: Number(mainDayToDay?.startingBalance) || 0,
    })
    .eq("id", mainAccountId)
    .eq("user_id", user.id);

  // 2. Any additional day-to-day accounts.
  if (extraDayToDay.length > 0) {
    await supabase.from("accounts").insert(
      extraDayToDay.map((a) => ({
        user_id: user.id,
        space_id: spaceId,
        name: a.name?.trim() || "Account",
        type: "checking",
        starting_balance: Number(a.startingBalance) || 0,
        include_in_overview: true,
      })),
    );
  }

  // 3. Income source, if answered.
  if (answers.income) {
    const dayOfMonth = clampDayOfMonth(answers.income.dayOfMonth);
    await supabase.from("income_sources").insert({
      user_id: user.id,
      space_id: spaceId,
      account_id: mainAccountId,
      category_id: null,
      name: answers.income.name?.trim() || "Income",
      schedule_type: answers.income.scheduleType,
      day_of_month: answers.income.scheduleType === "fixed_monthly_date" ? dayOfMonth : null,
      weekend_holiday_rule: answers.income.weekendHolidayRule,
      expected_amount: answers.income.expectedAmount != null ? Math.abs(Number(answers.income.expectedAmount)) : null,
      is_active: true,
    });
  }

  // 4. Fixed bills.
  if (answers.bills.length > 0) {
    await supabase.from("recurring_bills").insert(
      answers.bills.map((bill) => ({
        user_id: user.id,
        space_id: spaceId,
        account_id: mainAccountId,
        category_id: categoryIdFor(bill.categoryKey),
        name: bill.name?.trim() || "Bill",
        is_variable: false,
        amount: Math.abs(Number(bill.amount)) || 0,
        estimated_amount: null,
        due_day_of_month: clampDayOfMonth(bill.dueDayOfMonth) ?? 1,
        is_active: true,
      })),
    );
  }

  // 5. Set-aside accounts, then the allocation rules that target them (needs their real ids first).
  const ordered = orderedSetAsides(answers.setAsides);
  if (ordered.length > 0) {
    const { data: setAsideAccounts } = await supabase
      .from("accounts")
      .insert(
        ordered.map((row) => ({
          user_id: user.id,
          space_id: spaceId,
          name: row.name?.trim() || row.type,
          type: row.type,
          starting_balance: 0,
          include_in_overview: row.includeInOverview,
        })),
      )
      .select();

    if (setAsideAccounts) {
      await supabase.from("allocation_rules").insert(
        ordered.map((row, i) => ({
          user_id: user.id,
          space_id: spaceId,
          target_account_id: setAsideAccounts[i].id,
          priority_order: i,
          method: row.method,
          value: Math.abs(Number(row.value)) || 0,
          is_active: true,
        })),
      );
    }
  }

  // 6. Flip the gate.
  await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");
  revalidatePath("/dashboard/settings");

  redirect("/dashboard");
}
