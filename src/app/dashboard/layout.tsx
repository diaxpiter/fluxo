import { redirect } from "next/navigation";
import { getAuthenticatedUser, getProfile } from "@/lib/supabase/server";
import { BottomNav } from "@/app/dashboard/bottom-nav";
import { ToastHost } from "@/components/toast-host";
import { getDictionary, getLocale } from "@/lib/i18n/dictionary";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(user.id);
  if (!profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  const t = getDictionary(await getLocale());

  return (
    <>
      {children}
      <BottomNav t={t.nav} />
      <ToastHost />
    </>
  );
}
