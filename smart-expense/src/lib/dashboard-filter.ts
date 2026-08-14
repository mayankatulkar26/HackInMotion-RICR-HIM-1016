export function normalizeMonthFilter(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}$/.test(trimmed)) return null;

  const [yearRaw, monthRaw] = trimmed.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  const safe = new Date(Date.UTC(year, month - 1, 1));
  if (safe.getUTCFullYear() !== year || safe.getUTCMonth() !== month - 1) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}`;
}

export function monthRangeForFilter(month?: string | null): { start: Date; end: Date } | null {
  const normalized = normalizeMonthFilter(month);
  if (!normalized) return null;

  const [yearRaw, monthRaw] = normalized.split('-');
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;

  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

export function monthLabel(month?: string | null): string {
  const normalized = normalizeMonthFilter(month);
  if (!normalized) return 'All months';
  const [yearRaw, monthRaw] = normalized.split('-');
  const d = new Date(Date.UTC(Number(yearRaw), Number(monthRaw) - 1, 1));
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
