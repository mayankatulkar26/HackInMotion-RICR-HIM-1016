'use server';

import { getDocumentProxy, extractText } from 'unpdf';
import { normalizeRecords, type ParseResult } from '@/lib/csv';

const DATE_RE = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{1,2}-\d{1,2})\b/;
// Amount at end of line: 1,234.56 / 1234.56 / 1234 / ₹1,234
const AMOUNT_RE = /(?:₹\s*)?([\d,]+(?:\.\d{2})?)\s*(?:cr|dr|CR|DR)?\s*$/;

/**
 * Extract transactions from a PDF (bank statement). Best-effort: we look
 * for lines that start with a date and end with an amount, treating the
 * middle as the description. Layout varies wildly across banks — the
 * uploader shows the parsed rows for user review before anything is saved.
 */
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

  let text: string;
  try {
    const doc = await getDocumentProxy(buf);
    const res = await extractText(doc, { mergePages: true });
    text = Array.isArray(res.text) ? res.text.join('\n') : res.text;
  } catch (err) {
    console.error('[pdf] parse failed:', err);
    return { rows: [], headers: [], errors: ['Could not read this PDF'] };
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const records: Record<string, string>[] = [];

  for (const line of lines) {
    const dateM = DATE_RE.exec(line);
    if (!dateM) continue;
    // Cut everything from the date onward — description + amount
    const rest = line.slice(dateM.index + dateM[0].length).trim();
    if (!rest) continue;
    const amtM = AMOUNT_RE.exec(rest);
    if (!amtM) continue;

    const amount = amtM[1].replace(/,/g, '');
    if (!amount || parseFloat(amount) <= 0) continue;

    const description = rest.slice(0, amtM.index).trim();
    if (!description || description.length < 2) continue;

    // Heuristic type: line contains "CR" as a word → credit; default debit
    const type = /\bCR\b|\bCredit\b/i.test(line) ? 'credit' : 'debit';

    records.push({
      Date: dateM[0],
      Description: description,
      Amount: amount,
      Type: type,
    });
  }

  const headers = ['Date', 'Description', 'Amount', 'Type'];
  const rows = normalizeRecords(records, headers);
  return {
    rows,
    headers,
    errors: rows.length === 0
      ? ['No transactions detected — this PDF may not be text-based (scanned) or uses a layout we don\'t recognize.']
      : [],
  };
}
