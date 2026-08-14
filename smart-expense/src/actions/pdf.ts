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
 */
const MONTH_NAMES =
  '(?:jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)';

const DATE_RE = new RegExp(
  [
    String.raw`\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b`,
    String.raw`\b\d{4}-\d{1,2}-\d{1,2}\b`,
    String.raw`\b${MONTH_NAMES}\s+\d{1,2},?\s+\d{4}\b`,
    String.raw`\b\d{1,2}[\s\-]+${MONTH_NAMES}[\s\-]+\d{4}\b`,
  ].join('|'),
  'gi',
);

const AMOUNT_TOKEN = /(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/;
const AMOUNT_RE = new RegExp(AMOUNT_TOKEN.source, 'g');
const RUPEE_AMOUNT_RE = new RegExp(`₹\\s*${AMOUNT_TOKEN.source}`, 'g');

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 10_000_000;

// Lines that are clearly noise (headers, footers, page numbers, addresses)
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

function inRange(v: number): boolean {
  return !isNaN(v) && v >= MIN_AMOUNT && v <= MAX_AMOUNT;
}

/**
 * Split the extracted text into transaction blocks by date, then pull the
 * description + amount from each block.
 *
 * Amount picking priority (this is where PhonePe used to break):
 *   1. `₹<number>` — the unambiguous rupee marker wins over everything else
 *   2. Number immediately after DEBIT / CREDIT (typical bank layout)
 *   3. Largest plausible non-noise number in the block
 *
 * Before running any of that, we scrub the block of clock times, transaction
 * IDs, UTRs, phone numbers, and masked account tails — otherwise `01:37 pm`
 * leaks `37` as a candidate and it wins by proximity.
 */
function extractTransactionsFromText(text: string): Record<string, string>[] {
  const cleaned = text.replace(/[ \t]+/g, ' ');

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

    if (block.length > 2000) continue;

    const firstLine = block.split('\n').find((l) => l.trim().length > 0) ?? '';
    if (NOISE_RE.test(firstLine.trim())) continue;

    // Scrub noise before extracting amount candidates so digits from times /
    // reference IDs never enter the picker.
    const scrubbed = block
      .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm|AM|PM)?\b/g, ' ') // clock times
      .replace(/\bT\d{12,}\b/g, ' ') // PhonePe txn IDs (T + long digit run)
      .replace(/\b\d{12,}\b/g, ' ') // UTR / phone numbers
      .replace(/\b(?:X{3,}|\*{3,})\d+\b/g, ' ') // masked account tails
      .replace(/#\d+/g, ' ') // "Order #1234" style refs
      .replace(/\bXXXXX\w+\b/gi, ' ');

    let chosenValue: number | null = null;
    let chosenRaw: string | null = null;

    // STRATEGY 1: ₹ prefix wins
    RUPEE_AMOUNT_RE.lastIndex = 0;
    let ruMatch: RegExpExecArray | null;
    let bestRupee: { value: number; raw: string } | null = null;
    while ((ruMatch = RUPEE_AMOUNT_RE.exec(scrubbed)) !== null) {
      const v = parseFloat(ruMatch[1].replace(/,/g, ''));
      if (inRange(v)) {
        // First ₹<number> encountered is usually the transaction amount
        bestRupee = { value: v, raw: ruMatch[1] };
        break;
      }
    }
    if (bestRupee) {
      chosenValue = bestRupee.value;
      chosenRaw = bestRupee.raw;
    }

    // STRATEGY 2: number immediately after DEBIT / CREDIT
    if (chosenValue === null) {
      const drCr = new RegExp(
        `\\b(?:DEBIT|CREDIT|DR|CR)\\b[^\\d]{0,50}${AMOUNT_TOKEN.source}`,
        'i',
      ).exec(scrubbed);
      if (drCr) {
        const v = parseFloat(drCr[1].replace(/,/g, ''));
        if (inRange(v)) {
          chosenValue = v;
          chosenRaw = drCr[1];
        }
      }
    }

    // STRATEGY 3: largest plausible number in the (scrubbed) block
    if (chosenValue === null) {
      const candidates = Array.from(scrubbed.matchAll(AMOUNT_RE))
        .map((mm) => ({
          raw: mm[1],
          value: parseFloat(mm[1].replace(/,/g, '')),
        }))
        .filter((a) => inRange(a.value));
      if (candidates.length === 0) continue;
      const largest = candidates.reduce((best, cur) =>
        cur.value > best.value ? cur : best,
      );
      chosenValue = largest.value;
      chosenRaw = largest.raw;
    }

    if (chosenValue === null || chosenRaw === null) continue;

    // Build description: strip anything money-shaped and structural noise.
    let description = block
      .replace(/₹\s*[\d,]+(?:\.\d+)?/g, ' ') // ₹<amount>
      .replace(/\b(DR|CR|DEBIT|CREDIT)\b/gi, ' ')
      .replace(/\bT\d{12,}\b/g, ' ')
      .replace(/\b\d{12,}\b/g, ' ')
      .replace(/\bXXXXX\w+\b/gi, ' ')
      .replace(/\b(?:X{3,}|\*{3,})\d+\b/g, ' ')
      .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm|AM|PM)?\b/gi, ' ')
      .replace(/Transaction\s*ID/gi, ' ')
      .replace(/UTR\s*(?:No\.?)?/gi, ' ')
      .replace(/Paid by/gi, ' ')
      .replace(/Credited to/gi, ' ')
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
      Amount: String(chosenValue),
      Type: type,
    });
  }

  return records;
}
