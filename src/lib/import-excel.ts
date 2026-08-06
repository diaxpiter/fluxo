import * as XLSX from "xlsx";

export type ParsedTransaction = {
  date: string;
  description: string;
  amount: number;
};

export type MonthCheck = {
  month: string;
  expectedEndBalance: number;
  computedEndBalance: number;
  matches: boolean;
};

export type ParsedImport = {
  startingBalance: number;
  /** False when the file has no balance column -- `startingBalance` is then just a 0 placeholder, not a real inferred value. */
  startingBalanceKnown: boolean;
  transactions: ParsedTransaction[];
  monthChecks: MonthCheck[];
  /** Rows dropped for having a blank description or a non-numeric amount. */
  skippedCount: number;
};

function toYmd(value: unknown): string {
  if (value instanceof Date) {
    // SheetJS's cellDates option constructs the Date at *local* midnight for
    // the cell's calendar date, so it must be read back with local getters
    // (not UTC ones) — otherwise a positive-UTC-offset timezone reads back
    // the previous day (local midnight - offset crosses into the prior day
    // in UTC).
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value ?? "").slice(0, 10);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function isBlankRow(row: unknown[]) {
  return !row.some((cell) => cell !== undefined && cell !== null && cell !== "");
}

/**
 * One flat sheet, oldest transaction first. Row 1 is a header (skipped); every other non-blank
 * row is a transaction: date, description, amount, and -- optionally -- the account's balance
 * right after it, the way most bank statement exports include it. That balance column isn't
 * required to import, but when it's there it's used to infer the starting balance and to
 * sanity-check the import month by month.
 */
export function parseWorkbook(buffer: ArrayBuffer, locale = "en-US"): ParsedImport {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true });
  const dataRows = rows.slice(1).filter((row) => !isBlankRow(row));

  const transactions: ParsedTransaction[] = [];
  const statedBalances: number[] = [];
  let skippedCount = 0;

  for (const row of dataRows) {
    const description = String(row[1] ?? "").trim();
    const amount = Number(row[2]);
    if (!description || !Number.isFinite(amount)) {
      skippedCount++;
      continue;
    }

    transactions.push({ date: toYmd(row[0]), description, amount });
    statedBalances.push(Number(row[3]));
  }

  if (transactions.length === 0) {
    return { startingBalance: 0, startingBalanceKnown: false, transactions: [], monthChecks: [], skippedCount };
  }

  const startingBalanceKnown = Number.isFinite(statedBalances[0]);
  const startingBalance = startingBalanceKnown ? round2(statedBalances[0] - transactions[0].amount) : 0;

  const monthLabelFormat = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const monthChecks: MonthCheck[] = [];
  let runningBalance = startingBalance;
  let monthKey = transactions[0].date.slice(0, 7);
  let monthEndBalance = runningBalance;
  let monthExpected = NaN;

  const flushMonth = () => {
    if (!Number.isFinite(monthExpected)) return;
    const [year, month] = monthKey.split("-").map(Number);
    monthChecks.push({
      month: monthLabelFormat.format(new Date(year, month - 1, 1)),
      expectedEndBalance: round2(monthExpected),
      computedEndBalance: round2(monthEndBalance),
      matches: Math.abs(monthExpected - monthEndBalance) < 0.02,
    });
  };

  transactions.forEach((t, i) => {
    const key = t.date.slice(0, 7);
    if (key !== monthKey) {
      flushMonth();
      monthKey = key;
      // Don't carry a stated balance from a previous month into this one -- a month
      // with no balance column at all should skip its check, not be compared against
      // a leftover figure that has nothing to do with it.
      monthExpected = NaN;
    }
    runningBalance += t.amount;
    monthEndBalance = runningBalance;
    if (Number.isFinite(statedBalances[i])) monthExpected = statedBalances[i];
  });
  flushMonth();

  return { startingBalance, startingBalanceKnown, transactions, monthChecks, skippedCount };
}
