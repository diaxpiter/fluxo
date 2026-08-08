import { NextResponse } from "next/server";
import { createClient, getAuthenticatedUser, getProfile } from "@/lib/supabase/server";
import { getCurrentSpace } from "@/lib/spaces";
import { getDictionary, getLocale } from "@/lib/i18n/dictionary";
import { accountDisplayName, categoryDisplayName, getDashboardContext, getTransactionsForAccounts } from "@/lib/dashboard-data";

function csvEscape(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "space";
}

/** Lets a signed-in user download this space's data -- a personal backup, and an escape hatch from the app itself. */
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const format = new URL(request.url).searchParams.get("format") === "json" ? "json" : "csv";
  const locale = await getLocale();
  const t = getDictionary(locale);
  const supabase = await createClient();
  const { currentSpace } = await getCurrentSpace(supabase, user.id);

  const { accounts, categories, currency, recurringBills, incomeSources, allocationRules } = await getDashboardContext(
    supabase,
    user.id,
    getProfile(user.id),
    currentSpace,
  );
  const transactions = await getTransactionsForAccounts(
    supabase,
    accounts.map((a) => a.id),
  );

  const filenameBase = `fluxo-${slugify(currentSpace.name)}-${new Date().toISOString().slice(0, 10)}`;

  if (format === "json") {
    const body = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        space: { id: currentSpace.id, name: currentSpace.name, currency },
        accounts,
        categories,
        transactions,
        recurringBills,
        incomeSources,
        allocationRules,
      },
      null,
      2,
    );
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.json"`,
      },
    });
  }

  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const header = [
    t.transactionList.date,
    t.transactionList.description,
    t.transactionList.category,
    t.common.account,
    t.transactionList.amount,
  ];
  const rows = transactions.map((tx) => {
    const account = accountById.get(tx.account_id);
    const category = tx.category_id ? categoryById.get(tx.category_id) : undefined;
    return [
      tx.date,
      tx.description,
      category ? categoryDisplayName(category, t.categories) : t.common.uncategorized,
      account ? accountDisplayName(account, t.common.mainAccount) : "",
      Number(tx.amount).toFixed(2),
    ];
  });

  // Leading BOM so Excel opens accented characters (é, ã, ç, ...) correctly instead of mangling them.
  const csv = "\uFEFF" + [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
    },
  });
}
