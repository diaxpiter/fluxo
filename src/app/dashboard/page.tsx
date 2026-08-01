import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { TransactionForm } from "@/app/dashboard/transaction-form";
import { TransactionList } from "@/app/dashboard/transaction-list";
import { StartingBalanceEditor } from "@/app/dashboard/starting-balance-editor";
import type { Account, Category, Transaction } from "@/lib/types";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(amount);
}

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

  const [{ data: profile }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("profiles").select("currency").eq("id", user.id).single(),
    supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  const account = (accounts as Account[] | null)?.[0] ?? null;
  const currency = profile?.currency ?? "EUR";
  const categoryList = (categories as Category[] | null) ?? [];

  const { data: rawTransactions } = account
    ? await supabase
        .from("transactions")
        .select("*")
        .eq("account_id", account.id)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [] as Transaction[] };

  const transactions = (rawTransactions as Transaction[] | null) ?? [];

  const rows = transactions.reduce<Array<Transaction & { balance: number }>>((acc, t) => {
    const previousBalance = acc.at(-1)?.balance ?? account?.starting_balance ?? 0;
    acc.push({ ...t, balance: previousBalance + Number(t.amount) });
    return acc;
  }, []);
  const currentBalance = rows.at(-1)?.balance ?? account?.starting_balance ?? 0;

  return (
    <main className="flex flex-1 flex-col px-4 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Hi, {firstName}</h1>
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

        {!account ? (
          <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-6 text-sm text-foreground/60">
            Setting up your account…
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between rounded-xl border border-foreground/10 bg-foreground/[0.02] p-6">
              <div>
                <p className="text-sm text-foreground/60">{account.name}</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight">
                  {formatCurrency(currentBalance, currency)}
                </p>
              </div>
              <StartingBalanceEditor
                accountId={account.id}
                startingBalance={account.starting_balance}
              />
            </div>

            <TransactionForm accountId={account.id} categories={categoryList} />

            <TransactionList rows={rows} categories={categoryList} currency={currency} />
          </>
        )}
      </div>
    </main>
  );
}
