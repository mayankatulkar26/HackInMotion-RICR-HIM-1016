import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format an amount as INR (or given currency) preserving decimals when they
 * exist. `₹214.90` stays as `₹214.90`, whole numbers stay clean (`₹100`, not
 * `₹100.00`), and true fractional amounts round to the paise (`₹123.456` → `₹123.46`).
 *
 * Pass `{ exact: true }` to always show 2 decimals (useful for detail views).
 */
export function formatCurrency(
  amount: number,
  currency = 'INR',
  opts: { exact?: boolean } = {},
): string {
  const hasFraction = Math.abs(amount) - Math.floor(Math.abs(amount)) > 0.005;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: opts.exact ? 2 : hasFraction ? 2 : 0,
    maximumFractionDigits: opts.exact ? 2 : hasFraction ? 2 : 0,
  }).format(amount);
}

export function formatCompactCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
