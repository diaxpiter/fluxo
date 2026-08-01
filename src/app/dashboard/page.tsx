import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName = (user.user_metadata?.display_name as string) || user.email;
  const firstName = displayName?.split(" ")[0];

  return (
    <main className="flex flex-1 flex-col px-4 py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Hi, {firstName}
            </h1>
            <p className="mt-1 text-sm text-foreground/60">{user.email}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-foreground/15 px-3 py-2 text-sm font-medium transition-colors hover:bg-foreground/5"
            >
              Log out
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-6 text-sm text-foreground/60">
          Your ledger will show up here next.
        </div>
      </div>
    </main>
  );
}
