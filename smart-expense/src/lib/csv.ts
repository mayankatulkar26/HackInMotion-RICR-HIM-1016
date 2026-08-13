import Papa from 'papaparse';

export type ParsedRow = {
  rowIndex: number;
  raw: Record<string, string>;
  date: Date | null;
  description: string;
  amount: number | null;
  type: 'debit' | 'credit';
  warnings: string[];
};

export type ParseResult = {
  rows: ParsedRow[];
  headers: string[];
  errors: string[];
};

const DATE_FORMATS: Array<(s: string) => Date | null> = [
  // ISO YYYY-MM-DD
  (s) => {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) ? null : d;
  },
  // DD/MM/YYYY or DD-MM-YYYY (Indian default)
  (s) => {
    const m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/.exec(s);
    if (!m) return null;
    const yearRaw = +m[3];
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    const d = new Date(year, +m[2] - 1, +m[1]);
    return isNaN(d.getTime()) ? null : d;
  },
  // MM/DD/YYYY (US) — only when the "day" position is impossible as a month
  (s) => {
    const m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/.exec(s);
    if (!m) return null;
    const day = +m[2];
    if (day > 12) return null;
    const yearRaw = +m[3];
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    const d = new Date(year, +m[1] - 1, day);
    return isNaN(d.getTime()) ? null : d;
  },
  // Fallback: native Date parse (handles "12 Aug 2026", "Aug 12, 2026", etc.)
  (s) => {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  },
];

export function parseDate(input: string): Date | null {
  const s = input.trim();
  if (!s) return null;
  for (const fn of DATE_FORMATS) {
    const d = fn(s);
    if (d) return d;
  }
  return null;
}

/**
 * Fuzzy header match — tries exact first, then substring `includes`.
 * Bank statements use "Withdrawal Amt", "Withdrawal Amt.", "Debit Amount"
 * etc., so a plain equality check misses too many real-world files.
 *
 * When `excludeAmbiguous` is set, headers mentioning both "credit" and
 * "debit" (e.g. PhonePe's "Credit/debit instrument") are skipped — those
 * are descriptor columns, not amount columns.
 */
function findHeader(
  headers: string[],
  key: string,
  opts?: { excludeAmbiguous?: boolean },
): string | null {
  const norm = (s: string) => s.toLowerCase().trim().replace(/[.\s]+/g, ' ');
  const target = norm(key);
  const idx = headers.findIndex((h) => norm(h) === target);
  if (idx >= 0) return headers[idx];
  const partial = headers.findIndex((h) => {
    const n = norm(h);
    if (!n.includes(target)) return false;
    if (opts?.excludeAmbiguous && n.includes('credit') && n.includes('debit')) {
      return false;
    }
    return true;
  });
  return partial >= 0 ? headers[partial] : null;
}

/** True if the row *looks* like a header row for a bank statement. */
export function isHeaderRow(cells: unknown[]): boolean {
  const KEYWORDS = [
    'date', 'description', 'narration', 'particulars', 'details',
    'amount', 'debit', 'credit', 'withdrawal', 'deposit',
    'value', 'type', 'dr/cr',
  ];
  const lower = cells.map((c) => String(c ?? '').toLowerCase().trim());
  const hit = KEYWORDS.filter((kw) => lower.some((c) => c.includes(kw))).length;
  // A header row typically has ≥2 known column names AND at least one date-y or amount-y word
  return (
    hit >= 2 &&
    lower.some((c) => c.includes('date')) &&
    lower.some((c) =>
      /(amount|debit|credit|withdrawal|deposit|value)/.test(c),
    )
  );
}

/**
 * Shared normalizer used by every source (CSV / Excel / PDF).
 * Takes tabular records + header names and produces ParsedRow[] with
 * per-row warnings. Never throws.
 */
export function normalizeRecords(
  records: Record<string, string>[],
  headers: string[],
): ParsedRow[] {
  const dateH =
    findHeader(headers, 'date') ??
    findHeader(headers, 'transaction date') ??
    findHeader(headers, 'txn date');
  const descH =
    findHeader(headers, 'description') ??
    findHeader(headers, 'narration') ??
    findHeader(headers, 'particulars') ??
    findHeader(headers, 'details');
  const amountH = findHeader(headers, 'amount') ?? findHeader(headers, 'value');
  // Indian bank statements often use "Withdrawal Amt" / "Deposit Amt"
  // (or "Withdrawal (Dr)" / "Deposit (Cr)") instead of "debit" / "credit".
  // excludeAmbiguous skips descriptor columns like "Credit/debit instrument".
  const debitH =
    findHeader(headers, 'withdrawal') ??
    findHeader(headers, 'withdrawal amt') ??
    findHeader(headers, 'withdrawal amount') ??
    findHeader(headers, 'debit', { excludeAmbiguous: true }) ??
    findHeader(headers, 'debit amount');
  const creditH =
    findHeader(headers, 'deposit') ??
    findHeader(headers, 'deposit amt') ??
    findHeader(headers, 'deposit amount') ??
    findHeader(headers, 'credit', { excludeAmbiguous: true }) ??
    findHeader(headers, 'credit amount');
  const typeH = findHeader(headers, 'type') ?? findHeader(headers, 'dr/cr');

  return records.map((raw, i) => {
    const warnings: string[] = [];

    let date: Date | null = null;
    const dateVal = dateH ? String(raw[dateH] ?? '') : '';
    if (dateVal) {
      date = parseDate(dateVal);
      if (!date) warnings.push(`Unrecognized date "${dateVal}"`);
    } else {
      warnings.push('Missing date');
    }

    const description = (descH ? String(raw[descH] ?? '') : '').trim();
    if (!description) warnings.push('Missing description');

    let amount: number | null = null;
    let type: 'debit' | 'credit' = 'debit';

    const dv = debitH ? String(raw[debitH] ?? '').replace(/[,₹\s]/g, '') : '';
    const cv = creditH ? String(raw[creditH] ?? '').replace(/[,₹\s]/g, '') : '';

    if (dv && parseFloat(dv) > 0) {
      amount = parseFloat(dv);
      type = 'debit';
    } else if (cv && parseFloat(cv) > 0) {
      amount = parseFloat(cv);
      type = 'credit';
    } else if (amountH && raw[amountH]) {
      const cleaned = String(raw[amountH]).replace(/[,₹\s]/g, '');
      const n = parseFloat(cleaned);
      if (!isNaN(n)) {
        amount = Math.abs(n);
        if (typeH && raw[typeH]) {
          const t = String(raw[typeH]).toLowerCase().trim();
          type = t.startsWith('c') || t === 'credit' || t === 'cr' ? 'credit' : 'debit';
        } else {
          type = n < 0 ? 'debit' : 'credit';
        }
      }
    }
    if (amount === null) warnings.push('Missing or invalid amount');

    return { rowIndex: i, raw, date, description, amount, type, warnings };
  });
}

/**
 * Parses CSV text into normalized rows with per-row warnings.
 *
 * Real-world statements (PhonePe, Paytm, HDFC etc.) prefix the data with
 * a title line, a duration line, and blank rows. Papa's default `header:true`
 * would treat that title line as the header and produce zero valid rows.
 *
 * Strategy: parse without `header`, get a 2D grid, find the first row that
 * looks like a real header (contains "date" + one of amount/debit/credit/
 * withdrawal/deposit), and treat everything above as preamble and everything
 * below as data. Trailing footers (disclaimers, single-cell lines) are
 * dropped by the nonEmpty<2 filter.
 */
export function parseCsv(csvText: string): ParseResult {
  const parsed = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
  });
  const errors = parsed.errors.map((e) => `Row ${e.row}: ${e.message}`);
  const grid = parsed.data;

  if (grid.length === 0) {
    return { rows: [], headers: [], errors: [...errors, 'CSV is empty'] };
  }

  let headerIdx = -1;
  const scanTo = Math.min(grid.length, 40);
  for (let i = 0; i < scanTo; i++) {
    if (isHeaderRow(grid[i])) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) headerIdx = 0;

  const rawHeaders = grid[headerIdx].map((c) => String(c ?? '').trim());
  const headers = rawHeaders.filter((h) => h.length > 0);

  const records: Record<string, string>[] = [];
  for (let r = headerIdx + 1; r < grid.length; r++) {
    const row = grid[r];
    const nonEmpty = row.filter((c) => String(c ?? '').trim().length > 0).length;
    // Skip footer / disclaimer / single-cell lines
    if (nonEmpty < 2) continue;
    const rec: Record<string, string> = {};
    rawHeaders.forEach((h, i) => {
      if (!h) return;
      rec[h] = String(row[i] ?? '').trim();
    });
    records.push(rec);
  }

  return { rows: normalizeRecords(records, headers), headers, errors };
}

/**
 * Stable hash used to detect duplicates within the same user's transactions.
 * (amount + date-day + normalized description).
 */
export function dedupeHash(input: {
  amount: number;
  date: Date;
  description: string;
}): string {
  const day = `${input.date.getFullYear()}-${input.date.getMonth() + 1}-${input.date.getDate()}`;
  const desc = input.description.toLowerCase().replace(/\s+/g, ' ').trim();
  return `${input.amount.toFixed(2)}|${day}|${desc}`;
}
