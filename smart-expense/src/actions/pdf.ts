'use server';

import { getDocumentProxy, extractText } from 'unpdf';
import { normalizeRecords, type ParseResult } from '@/lib/csv';

/**
 * Date patterns we recognize in PDFs.
 *
 * Real bank statements (HDFC, ICICI, PhonePe, Paytm) use very different date
 * shapes. We match:
 *   - DD/MM/YYYY or DD-MM-YYYY  → "13/08/2026"
 *   - YYYY-MM-DD                → "2026-08-13"
 *   - Mon D, YYYY               → "Aug 13, 2026"
 *   - D Mon YYYY                → "13 Aug 2026"
 *   - D-Mon-YYYY                → "13-Aug-2026"
 *
 * `MONTH_NAMES` covers Jan-Dec / January-December (case-insensitive).
 */
const MONTH_NAMES =
  '(?:jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)';

const DATE_RE = new RegExp(
  [
    // 13/08/2026 or 13-08-2026
    String.raw`\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b`,
    // 2026-08-13
    String.raw`\b\d{4}-\d{1,2}-\d{1,2}\b`,
    // Aug 13, 2026 / August 13, 2026
    String.raw`\b${MONTH_NAMES}\s+\d{1,2},?\s+\d{4}\b`,
    // 13 Aug 2026 / 13-Aug-2026
    String.raw`\b\d{1,2}[\s\-]+${MONTH_NAMES}[\s\-]+\d{4}\b`,
  ].join('|'),
  'gi',
);

// Amount pattern: 1,234.56 / 1234 / ₹1,234 — with optional CR/DR suffix
const AMOUNT_RE = /(?:₹\s*)?(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/g;

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 10_000_000;

// Ignore lines that are clearly noise (headers, footers, page numbers, addresses)
const NOISE_RE =
  /^(page \d|statement|account number|balance|opening bal|closing bal|total|©|www\.|https?:|confidential|disclaimer|terms|address|branch|ifsc|swift)/i;

export async function parsePdfAction(formData: FormData): Promise<ParseResult> {
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { rows: [], headers: [], errors: ['No file provided'] };
  }
  if (file.size === 0) {
    return { rows: [], headers: [], errors: ['Empty file'] };
  }
  const MAX = 4 * 1024 * 1024;
  if (file.size > MAX) {
    return {
      rows: [],
      headers: [],
      errors: [`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB, max 4 MB)`],
    };
  }

  const buf = new Uint8Array(await file.arrayBuffer());

  let rawText: string;
  try {
    const doc = await getDocumentProxy(buf);
    const res = await extractText(doc, { mergePages: true });
    rawText = Array.isArray(res.text) ? res.text.join('\n') : res.text;
  } catch (err) {
    console.error('[pdf] parse failed:', err);
    return { rows: [], headers: [], errors: ['Could not read this PDF'] };
  }

  if (!rawText.trim()) {
    return {
      rows: [],
      headers: [],
      errors: [
        'PDF contains no extractable text — likely a scanned image. Try re-exporting as text-based PDF or use the CSV export from your bank instead.',
      ],
    };
  }

  const records = extractTransactionsFromText(rawText);

  if (records.length === 0) {
    // Return the first slice of extracted text so we can see what unpdf produced.
    const preview = rawText.slice(0, 400).replace(/\s+/g, ' ').trim();
    return {
      rows: [],
      headers: [],
      errors: [
        "No transactions detected. This is what the PDF's text looks like — send it back if you want the parser tuned for this bank:",
        preview + (rawText.length > 400 ? ' …' : ''),
      ],
    };
  }

  const headers = ['Date', 'Description', 'Amount', 'Type'];
  const rows = normalizeRecords(records, headers);
  return { rows, headers, errors: [] };
}

/**
 * Split the extracted text into transaction blocks by date, then pull the
 * description + amount from each block. Blocks may span multiple lines
 * (a common shape when bank statements render one field per row of the table).
 */
function extractTransactionsFromText(text: string): Record<string, string>[] {
  // Normalize whitespace but keep line breaks (blocks are separated by dates,
  // not by explicit blank lines).
  const cleaned = text.replace(/[ \t]+/g, ' ');

  // Find every date position. Each block runs from one date to just before
  // the next date.
  const matches: { idx: number; date: string }[] = [];
  DATE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = DATE_RE.exec(cleaned)) !== null) {
    matches.push({ idx: m.index, date: m[0] });
  }
  if (matches.length === 0) return [];

  const records: Record<string, string>[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].idx + matches[i].date.length;
    const end = i + 1 < matches.length ? matches[i + 1].idx : cleaned.length;
    const block = cleaned.slice(start, end);

    // Skip blocks that are absurdly long (probably grabbed the whole footer)
    if (block.length > 2000) continue;

    // Skip blocks that are pure noise
    const firstLine = block.split('\n').find((l) => l.trim().length > 0) ?? '';
    if (NOISE_RE.test(firstLine.trim())) continue;

    // Pull all amount candidates from the block; take the LAST plausible one
    // (bank rows tend to have running-balance at the end after the amount, but
    // the amount is typically the largest structured number besides balance —
    // safer to take the first standalone one after removing very small "id" numbers).
    const amountMatches = Array.from(block.matchAll(AMOUNT_RE))
      .map((m) => ({
        idx: m.index ?? 0,
        raw: m[1],
        value: parseFloat(m[1].replace(/,/g, '')),
      }))
      .filter(
        (a) =>
          !isNaN(a.value) &&
          a.value >= MIN_AMOUNT &&
          a.value <= MAX_AMOUNT &&
          // Skip long digit runs that look like transaction IDs / phone numbers
          a.raw.replace(/[,.]/g, '').length < 12,
      );

    if (amountMatches.length === 0) continue;

    // Pick the amount that appears LAST (bank rows: ... desc ... AMOUNT BALANCE
    // is common but so is desc AMOUNT. Last one is usually the transaction amount.)
    // If there's a clear CR/DR nearby, prefer that one.
    const drCrPos = block.search(/\b(DR|CR|DEBIT|CREDIT)\b/i);
    let chosen = amountMatches[amountMatches.length - 1];
    if (drCrPos >= 0) {
      const nearby = amountMatches
        .filter((a) => Math.abs(a.idx - drCrPos) < 40)
        .sort(
          (x, y) => Math.abs(x.idx - drCrPos) - Math.abs(y.idx - drCrPos),
        );
      if (nearby[0]) chosen = nearby[0];
    }

    // Description = block text minus the chosen amount and minus DR/CR/DEBIT/CREDIT tokens
    let description = block
      .replace(new RegExp(`(?:₹\\s*)?${escapeRegex(chosen.raw)}`), ' ')
      .replace(/\b(DR|CR|DEBIT|CREDIT)\b/gi, ' ')
      .replace(/\bT\d{15,}\b/g, ' ') // PhonePe transaction IDs
      .replace(/\b\d{10,}\b/g, ' ') // long numeric ids / UTR / phone
      .replace(/\s+/g, ' ')
      .trim();

    // Trim overly long descriptions
    if (description.length > 240) description = description.slice(0, 240);
    if (!description || description.length < 2) continue;

    const type = /\b(CR|CREDIT)\b/i.test(block)
      ? 'credit'
      : /\b(DR|DEBIT)\b/i.test(block)
        ? 'debit'
        : 'debit';

    records.push({
      Date: matches[i].date,
      Description: description,
      Amount: String(chosen.value),
      Type: type,
    });
  }

  return records;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
