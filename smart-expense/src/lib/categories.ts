export const CATEGORIES = [
  'Food',
  'Groceries',
  'Rent',
  'Shopping',
  'Subscriptions',
  'Travel',
  'Bills',
  'Entertainment',
  'Healthcare',
  'Education',
  'Salary',
  'Investment',
  'Transfer',
  'Other',
  'Uncategorized',
] as const;

export type Category = (typeof CATEGORIES)[number];

// Visual tokens for each category — used across charts, badges, cards.
export const CATEGORY_META: Record<
  Category,
  { color: string; ring: string; emoji: string }
> = {
  Food: { color: '#F97316', ring: 'ring-orange-500/20', emoji: '' },
  Groceries: { color: '#84CC16', ring: 'ring-lime-500/20', emoji: '' },
  Rent: { color: '#8B5CF6', ring: 'ring-violet-500/20', emoji: '' },
  Shopping: { color: '#EC4899', ring: 'ring-pink-500/20', emoji: '' },
  Subscriptions: { color: '#06B6D4', ring: 'ring-cyan-500/20', emoji: '' },
  Travel: { color: '#3B82F6', ring: 'ring-blue-500/20', emoji: '' },
  Bills: { color: '#EAB308', ring: 'ring-yellow-500/20', emoji: '' },
  Entertainment: { color: '#F43F5E', ring: 'ring-rose-500/20', emoji: '' },
  Healthcare: { color: '#10B981', ring: 'ring-emerald-500/20', emoji: '' },
  Education: { color: '#6366F1', ring: 'ring-indigo-500/20', emoji: '' },
  Salary: { color: '#22C55E', ring: 'ring-green-500/20', emoji: '' },
  Investment: { color: '#14B8A6', ring: 'ring-teal-500/20', emoji: '' },
  Transfer: { color: '#94A3B8', ring: 'ring-slate-500/20', emoji: '' },
  Other: { color: '#64748B', ring: 'ring-slate-500/20', emoji: '' },
  Uncategorized: { color: '#475569', ring: 'ring-slate-500/20', emoji: '' },
};

export function categoryColor(cat: string): string {
  return CATEGORY_META[cat as Category]?.color ?? '#64748B';
}
