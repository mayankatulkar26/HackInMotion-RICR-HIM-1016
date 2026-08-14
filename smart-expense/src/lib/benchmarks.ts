import type { Category } from './categories';

/**
 * Illustrative peer benchmarks for Indian urban/metro households.
 *
 * Values are typical **share of monthly income** spent per category, expressed
 * as a percentage. They're rounded, hand-tuned aggregates informed by
 * publicly available Indian household surveys (NSS Household Consumption
 * Expenditure Survey 2022-23, RBI household finance publications, and
 * category splits reported by fintech-industry blogs) — not a live cohort of
 * this app's users. Shown to the user as "typical" comparison, not "actual peers".
 *
 * Numbers within a bracket sum to ~65-80% (the balance is savings /
 * investment, tracked separately by the health score).
 *
 * Editing rule: if you change these, keep each bracket internally consistent
 * (add roughly 30-40 to get 100 for that income tier).
 */
export type IncomeBracket =
  | 'under-25k'
  | '25k-50k'
  | '50k-1L'
  | '1L-2L'
  | 'above-2L';

export const INCOME_BRACKETS: Array<{
  value: IncomeBracket;
  label: string;
  min: number;
  max: number; // inclusive upper bound; Infinity for open-ended
}> = [
  { value: 'under-25k', label: 'Under ₹25k / month', min: 0, max: 25_000 },
  { value: '25k-50k', label: '₹25k – ₹50k / month', min: 25_000, max: 50_000 },
  { value: '50k-1L', label: '₹50k – ₹1L / month', min: 50_000, max: 100_000 },
  { value: '1L-2L', label: '₹1L – ₹2L / month', min: 100_000, max: 200_000 },
  { value: 'above-2L', label: 'Above ₹2L / month', min: 200_000, max: Infinity },
];

type CategoryPercents = Partial<Record<Category, number>>;

export const PEER_BENCHMARKS: Record<IncomeBracket, CategoryPercents> = {
  'under-25k': {
    Rent: 30,
    Groceries: 20,
    Food: 6,
    Bills: 10,
    Travel: 8,
    Shopping: 6,
    Healthcare: 5,
    Entertainment: 2,
    Education: 4,
    Investment: 4,
    Subscriptions: 2,
  },
  '25k-50k': {
    Rent: 28,
    Groceries: 15,
    Food: 8,
    Bills: 8,
    Travel: 8,
    Shopping: 9,
    Healthcare: 4,
    Entertainment: 3,
    Education: 4,
    Investment: 10,
    Subscriptions: 3,
  },
  '50k-1L': {
    Rent: 25,
    Groceries: 12,
    Food: 9,
    Bills: 6,
    Travel: 9,
    Shopping: 11,
    Healthcare: 4,
    Entertainment: 4,
    Education: 4,
    Investment: 15,
    Subscriptions: 3,
  },
  '1L-2L': {
    Rent: 22,
    Groceries: 10,
    Food: 9,
    Bills: 5,
    Travel: 10,
    Shopping: 12,
    Healthcare: 4,
    Entertainment: 5,
    Education: 5,
    Investment: 20,
    Subscriptions: 3,
  },
  'above-2L': {
    Rent: 18,
    Groceries: 8,
    Food: 8,
    Bills: 4,
    Travel: 10,
    Shopping: 12,
    Healthcare: 4,
    Entertainment: 5,
    Education: 6,
    Investment: 27,
    Subscriptions: 3,
  },
};

export function bracketForMonthlyIncome(income: number): IncomeBracket {
  for (const b of INCOME_BRACKETS) {
    if (income >= b.min && income < b.max) return b.value;
  }
  // Zero-income users get the entry bracket so the comparison still renders.
  return 'under-25k';
}

export function bracketLabel(bracket: IncomeBracket): string {
  return INCOME_BRACKETS.find((b) => b.value === bracket)?.label ?? bracket;
}
