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
 * `excludeAmbiguous` skips columns mentioning both "credit" AND "debit"
 * (e.g. PhonePe's "Credit/debit instrument") — those are descriptor columns.
 * It also skips balance/date-ish columns that would silently pollute an
 * amount lookup (a "Value Dt" column would get picked as amount otherwise).
 *
 * `exactOnly` disables the partial match — used for very generic keys like
 * "value" which would otherwise steal "Value Date".
 */
function findHeader(
  headers: string[],
  key: string,
  opts?: { excludeAmbiguous?: boolean; exactOnly?: boolean },
): string | null {
  const norm = (s: string) => s.toLowerCase().trim().replace(/[.\s]+/g, ' ');
  const target = norm(key);
  const idx = headers.findIndex((h) => norm(h) === target);
  if (idx >= 0) return headers[idx];
  if (opts?.exactOnly) return null;
  const partial = headers.findIndex((h) => {
    const n = norm(h);
    if (!n.includes(target)) return false;
    if (opts?.excludeAmbiguous) {
      // Descriptor columns naming both sides at once
      if (n.includes('credit') && n.includes('debit')) return false;
      // Date-ish columns ("Value Dt", "Txn Date") — never actually amounts
      if (/\b(date|dt)\b/.test(n)) return false;
      // Balance / running total columns
      if (n.includes('balance')) return false;
    }
    return true;
  });
  return partial >= 0 ? headers[partial] : null;
}

/**
 * Extract a signed rupee value from any cell string.
 *
 * Handles: leading currency prefixes (₹, Rs., INR), thousands separators,
 * trailing DR/CR markers, accounting-negative parentheses `(1,003.50)`,
 * and stray non-numeric text ("1,003.50 refund"). Returns null when there's
 * no plausible number in the cell.
 *
 * The critical difference from `parseFloat(cell.replace(/[,₹\s]/g,''))`:
 * that older approach would parse `"57 refund from ₹1,003.50"` as 57 because
 * parseFloat stops at the first non-numeric run — this picks the
 * largest-magnitude candidate instead, which is what a bank row's amount
 * always is.
 */
export function parseAmount(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  // Accounting parentheses = negative
  const wrappedInParens = /^\((.+)\)\s*(?:dr|cr)?\s*$/i.exec(raw);
  const body = wrappedInParens ? wrappedInParens[1] : raw;

  // Every numeric token (may include thousands commas and one decimal group)
  const matches = body.match(/-?\d[\d,]*(?:\.\d+)?/g);
  if (!matches || matches.length === 0) return null;

  // Pick the token with the largest absolute value — for a bank cell like
  // "₹1,003.50 (Dr) - Bal ₹57,000" this picks 1003.50, not 57000 or 50.
  // We give a very slight tie-break to the first number so a clean "1003.50"
  // still wins over its own subparts.
  let best: number | null = null;
  for (const tok of matches) {
    const n = parseFloat(tok.replace(/,/g, ''));
    if (isNaN(n)) continue;
    if (best === null || Math.abs(n) > Math.abs(best)) best = n;
  }
  if (best === null) return null;
  return wrappedInParens ? -Math.abs(best) : best;
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
  // 'value' as an alias for amount is exact-only — a fuzzy match would grab
  // "Value Date" / "Value Dt" columns, which are dates, and parseFloat on
  // "10/08/2026" would return 10 as the "amount".
  const amountH =
    findHeader(headers, 'amount', { excludeAmbiguous: true }) ??
    findHeader(headers, 'txn amount', { excludeAmbiguous: true }) ??
    findHeader(headers, 'transaction amount', { excludeAmbiguous: true }) ??
    findHeader(headers, 'value', { exactOnly: true });
  // Indian bank statements often use "Withdrawal Amt" / "Deposit Amt"
  // (or "Withdrawal (Dr)" / "Deposit (Cr)") instead of "debit" / "credit".
  const debitH =
    findHeader(headers, 'withdrawal', { excludeAmbiguous: true }) ??
    findHeader(headers, 'withdrawal amt', { excludeAmbiguous: true }) ??
    findHeader(headers, 'withdrawal amount', { excludeAmbiguous: true }) ??
    findHeader(headers, 'debit', { excludeAmbiguous: true }) ??
    findHeader(headers, 'debit amount', { excludeAmbiguous: true });
  const creditH =
    findHeader(headers, 'deposit', { excludeAmbiguous: true }) ??
    findHeader(headers, 'deposit amt', { excludeAmbiguous: true }) ??
    findHeader(headers, 'deposit amount', { excludeAmbiguous: true }) ??
    findHeader(headers, 'credit', { excludeAmbiguous: true }) ??
    findHeader(headers, 'credit amount', { excludeAmbiguous: true });
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

    const dv = debitH ? parseAmount(raw[debitH]) : null;
    const cv = creditH ? parseAmount(raw[creditH]) : null;

    if (dv !== null && dv > 0) {
      amount = dv;
      type = 'debit';
    } else if (cv !== null && cv > 0) {
      amount = cv;
      type = 'credit';
    } else if (amountH && raw[amountH]) {
      const n = parseAmount(raw[amountH]);
      if (n !== null) {
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
