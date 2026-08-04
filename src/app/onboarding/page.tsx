import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/app/onboarding/onboarding-wizard";
import { getDictionary, getLocale } from "@/lib/i18n/dictionary";
import type { Account } from "@/lib/types";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const locale = await getLocale();
  const t = getDictionary(locale);

  const [{ data: profile }, { data: accounts }] = await Promise.all([
    supabase.from("profiles").select("onboarding_completed, currency").eq("id", user.id).single(),
    supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
  ]);

  if (profile?.onboarding_completed) {
    redirect("/dashboard");
  }

  const mainAccount = (accounts as Account[] | null)?.[0] ?? null;

  return (
    <main className="flex flex-1 flex-col px-4 pb-16 pt-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <p className="text-sm font-medium tracking-tight text-foreground/50">
          <span className="text-emerald-500">.</span>fluxo
        </p>

        {!mainAccount ? (
          // Should never happen -- the signup trigger always seeds one atomically with the user row.
          // Render instead of redirecting to /dashboard: that would bounce straight back here via the
          // layout gate (onboarding_completed is still false), looping instead of dead-ending.
          <p className="text-sm text-foreground/50">{t.common.settingUpAccount}</p>
        ) : (
          <OnboardingWizard
            mainAccountId={mainAccount.id}
            currency={profile?.currency ?? "EUR"}
            locale={locale}
            t={t}
          />
        )}
      </div>
    </main>
  );
}
