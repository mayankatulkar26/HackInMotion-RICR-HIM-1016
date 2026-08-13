import * as XLSX from 'xlsx';
import { isHeaderRow, normalizeRecords, type ParseResult } from '@/lib/csv';

/**
 * Parse an Excel (.xlsx / .xls) file's first sheet.
 *
 * Bank statements typically start with 5-10 rows of preamble (account
 * number, statement period, blank rows, sub-totals) before the actual
 * column headers. Feeding those to `normalizeRecords` gives 0 valid rows
 * because the "headers" it sees are things like "Statement Period".
 *
 * We fix this by scanning the first 40 rows for the first one that looks
 * like a real header row (contains "date" and one of amount/debit/credit/
 * withdrawal/deposit). Everything above becomes preamble; everything below
 * becomes data.
 */
export function parseExcel(buffer: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
  if (!wb.SheetNames.length) {
    return { rows: [], headers: [], errors: ['Workbook has no sheets'] };
  }
  const sheet = wb.Sheets[wb.SheetNames[0]];

  // Read as a 2D array so we can pick the header row ourselves.
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });

  if (grid.length === 0) {
    return { rows: [], headers: [], errors: ['Sheet is empty'] };
  }

  // Find the header row within the first 40 rows.
  let headerIdx = -1;
  const scanTo = Math.min(grid.length, 40);
  for (let i = 0; i < scanTo; i++) {
    if (isHeaderRow(grid[i])) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    // Fallback: assume row 0 is the header (behaves like the old code).
    headerIdx = 0;
  }

  const rawHeaders = grid[headerIdx].map((c) => String(c ?? '').trim());
  const headers = rawHeaders.filter((h) => h.length > 0);

  const records: Record<string, string>[] = [];
  for (let r = headerIdx + 1; r < grid.length; r++) {
    const row = grid[r];
    // Skip fully empty rows and any row that's clearly not a transaction
    // (e.g. a totals row with only two cells).
    const nonEmpty = row.filter((c) => String(c ?? '').trim().length > 0).length;
    if (nonEmpty < 2) continue;

    const rec: Record<string, string> = {};
    rawHeaders.forEach((h, i) => {
      if (!h) return;
      rec[h] = String(row[i] ?? '').trim();
    });
    records.push(rec);
  }

  return { rows: normalizeRecords(records, headers), headers, errors: [] };
}
