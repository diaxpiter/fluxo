import { BottomNav } from "@/app/dashboard/bottom-nav";
import { getDictionary, getLocale } from "@/lib/i18n/dictionary";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const t = getDictionary(await getLocale());

  return (
    <>
      {children}
      <BottomNav t={t.nav} />
    </>
  );
}
