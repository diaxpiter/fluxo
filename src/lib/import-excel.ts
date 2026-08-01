import * as XLSX from "xlsx";

export type ParsedTransaction = {
  date: string;
  description: string;
  amount: number;
};

export type MonthCheck = {
  sheet: string;
  expectedEndBalance: number;
  computedEndBalance: number;
  matches: boolean;
};

export type ParsedImport = {
  startingBalance: number;
  transactions: ParsedTransaction[];
  monthChecks: MonthCheck[];
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
 * Each sheet is one month. Row 1 is a header, row 2 is a "Saldo Anterior"
 * carry-over checkpoint (not a real transaction — its balance becomes the
 * account's starting balance for the very first sheet). Every other
 * non-blank row, including the last one, is a real transaction.
 */
export function parseWorkbook(buffer: ArrayBuffer): ParsedImport {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const transactions: ParsedTransaction[] = [];
  const monthChecks: MonthCheck[] = [];
  let startingBalance = 0;
  let runningBalance = 0;

  workbook.SheetNames.forEach((sheetName, sheetIndex) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true });
    const dataRows = rows.slice(1).filter((row) => !isBlankRow(row));
    if (dataRows.length === 0) return;

    const [checkpoint, ...realRows] = dataRows;

    if (sheetIndex === 0) {
      const checkpointBalance = Number(checkpoint[3]);
      startingBalance = Number.isFinite(checkpointBalance) ? checkpointBalance : 0;
      runningBalance = startingBalance;
    }

    for (const row of realRows) {
      const description = String(row[1] ?? "").trim();
      const amount = Number(row[2]);
      if (!description || !Number.isFinite(amount)) continue;

      transactions.push({ date: toYmd(row[0]), description, amount });
      runningBalance += amount;
    }

    const expected = Number(realRows.at(-1)?.[3]);
    if (Number.isFinite(expected)) {
      monthChecks.push({
        sheet: sheetName,
        expectedEndBalance: round2(expected),
        computedEndBalance: round2(runningBalance),
        matches: Math.abs(expected - runningBalance) < 0.02,
      });
    }
  });

  return { startingBalance, transactions, monthChecks };
}
