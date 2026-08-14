export type TransactionsTab = 'manual' | 'csv';

export function getTransactionsTab(
  value?: string | string[] | null,
): TransactionsTab {
  if (Array.isArray(value)) {
    return value.includes('csv') ? 'csv' : 'manual';
  }

  return value === 'csv' ? 'csv' : 'manual';
}
