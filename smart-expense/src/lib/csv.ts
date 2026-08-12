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
  // MM/DD/YYYY (US)
  (s) => {
    const m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/.exec(s);
    if (!m) return null;
    const day = +m[2];
    if (day > 12) return null; // ambiguous, skip US format
    const yearRaw = +m[3];
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    const d = new Date(year, +m[1] - 1, day);
    return isNaN(d.getTime()) ? null : d;
  },
  // Fallback: native Date parse
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

const HEADER_MAP: Record<string, keyof ParsedRow | 'amount' | 'type'> = {
  date: 'date',
  'transaction date': 'date',
  'txn date': 'date',
  description: 'description',
  narration: 'description',
  particulars: 'description',
  details: 'description',
  amount: 'amount',
  value: 'amount',
  debit: 'amount',
  credit: 'amount',
  type: 'type',
  'dr/cr': 'type',
};

function findHeader(headers: string[], key: string): string | null {
  const lower = headers.map((h) => h.toLowerCase().trim());
  const idx = lower.indexOf(key);
  return idx >= 0 ? headers[idx] : null;
}

/**
 * Parses CSV text into normalized rows with per-row warnings.
 * Never throws — invalid rows are returned with warnings and null fields so
 * the UI can render them in a review step and let the user fix or skip.
 */
export function parseCsv(csvText: string): ParseResult {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const errors = result.errors.map((e) => `Row ${e.row}: ${e.message}`);
  const headers = result.meta.fields ?? [];

  const dateH = findHeader(headers, 'date') ??
    findHeader(headers, 'transaction date') ??
    findHeader(headers, 'txn date');
  const descH = findHeader(headers, 'description') ??
    findHeader(headers, 'narration') ??
    findHeader(headers, 'particulars') ??
    findHeader(headers, 'details');
  const amountH = findHeader(headers, 'amount') ?? findHeader(headers, 'value');
  const debitH = findHeader(headers, 'debit');
  const creditH = findHeader(headers, 'credit');
  const typeH = findHeader(headers, 'type') ?? findHeader(headers, 'dr/cr');

  const rows: ParsedRow[] = result.data.map((raw, i) => {
    const warnings: string[] = [];

    // Date
    let date: Date | null = null;
    const dateVal = dateH ? raw[dateH] : '';
    if (dateVal) {
      date = parseDate(dateVal);
      if (!date) warnings.push(`Unrecognized date "${dateVal}"`);
    } else {
      warnings.push('Missing date');
    }

    // Description
    const description = (descH ? raw[descH] : '')?.trim() || '';
    if (!description) warnings.push('Missing description');

    // Amount + type
    let amount: number | null = null;
    let type: 'debit' | 'credit' = 'debit';

    if (debitH && raw[debitH] && parseFloat(raw[debitH]) > 0) {
      amount = parseFloat(raw[debitH]);
      type = 'debit';
    } else if (creditH && raw[creditH] && parseFloat(raw[creditH]) > 0) {
      amount = parseFloat(raw[creditH]);
      type = 'credit';
    } else if (amountH && raw[amountH]) {
      const cleaned = raw[amountH].replace(/[,₹\s]/g, '');
      const n = parseFloat(cleaned);
      if (!isNaN(n)) {
        amount = Math.abs(n);
        if (typeH && raw[typeH]) {
          const t = raw[typeH].toLowerCase().trim();
          type = t.startsWith('c') || t === 'credit' || t === 'cr' ? 'credit' : 'debit';
        } else {
          type = n < 0 ? 'debit' : 'credit';
        }
      }
    }
    if (amount === null) warnings.push('Missing or invalid amount');

    return {
      rowIndex: i,
      raw,
      date,
      description,
      amount,
      type,
      warnings,
    };
  });

  return { rows, headers, errors };
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
