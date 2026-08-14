'use server';

import mongoose from 'mongoose';
import { connectDb } from '@/db';
import { Transaction, Budget, SavingsGoal } from '@/db/models';
import { auth } from '@/lib/auth';
import { generateRecommendations } from '@/lib/gemini';
import { monthRangeForFilter } from '@/lib/dashboard-filter';
import { monthKey } from '@/lib/utils';

/**
 * All analytics live behind server actions so client components stay lean.
 * We treat `category === "Transfer"` as neither income nor expense — those
 * are UPI money-shuffle rows that would otherwise inflate both sides.
 */
const EXCLUDE_FROM_TOTALS = ['Transfer'] as const;

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');
  await connectDb();
  return new mongoose.Types.ObjectId(session.user.id);
}

/** ISO YYYY-MM for `n` months back from a reference date (inclusive of ref). */
function monthKeysBack(ref: Date, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    out.push(monthKey(d));
  }
  return out;
}

function startOfMonth(d: Date): Date {
  const s = new Date(d);
  s.setDate(1);
  s.setHours(0, 0, 0, 0);
  return s;
}

/**
 * "YYYY-MM" → { start, end } (exclusive) for that calendar month.
 * `all` or undefined returns undefined (no date filter).
 */
function monthBounds(
  month?: string,
): { start: Date; end: Date; key: string } | null {
  if (!month || month === 'all' || !/^\d{4}-\d{2}$/.test(month)) return null;
  const [y, m] = month.split('-').map(Number);
  return {
    start: new Date(y, m - 1, 1),
    end: new Date(y, m, 1),
    key: month,
  };
}

/* -------------------------------------------------- Aggregation helpers -- */

/** Sum of debit transactions per category since `since`. */
export async function spendByCategorySince(
  since: Date,
): Promise<Record<string, number>> {
  const userId = await requireUser();
  const rows = await Transaction.aggregate<{ _id: string; total: number }>([
    { $match: { userId, type: 'debit', date: { $gte: since } } },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.total]));
}

/** Same shape as `spendByCategorySince`, bounded on both ends. */
export async function spendByCategoryBetween(
  start: Date,
  end: Date,
): Promise<Record<string, number>> {
  const userId = await requireUser();
  const rows = await Transaction.aggregate<{ _id: string; total: number }>([
    { $match: { userId, type: 'debit', date: { $gte: start, $lt: end } } },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.total]));
}

/** Top N spending categories across ALL user data, largest first. */
export async function topCategories(
  limit = 6,
  month?: string | null,
): Promise<Array<{ category: string; amount: number }>> {
  const userId = await requireUser();
  const dateFilter = month ? monthRangeForFilter(month) : null;
  const rows = await Transaction.aggregate<{ _id: string; total: number }>([
    {
      $match: {
        userId,
        type: 'debit',
        category: { $nin: EXCLUDE_FROM_TOTALS },
        ...(dateFilter ? { date: { $gte: dateFilter.start, $lte: dateFilter.end } } : {}),
      },
    },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
    { $limit: limit },
  ]);
  return rows.map((r) => ({ category: r._id, amount: r.total }));
}

/**
 * Per-month totals (income vs expense) for the last N months.
 * Missing months are filled with zeros so charts stay evenly spaced.
 */
export async function monthlyTrend(
  months = 6,
  month?: string | null,
): Promise<Array<{ month: string; income: number; expense: number }>> {
  const userId = await requireUser();
  const now = month ? new Date(`${month}-01T00:00:00Z`) : new Date();
  const startRef = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const rows = await Transaction.aggregate<{
    _id: { month: string; type: 'debit' | 'credit' };
    total: number;
  }>([
    {
      $match: {
        userId,
        date: { $gte: startRef },
        category: { $nin: EXCLUDE_FROM_TOTALS },
      },
    },
    {
      $group: {
        _id: {
          month: { $dateToString: { format: '%Y-%m', date: '$date' } },
          type: '$type',
        },
        total: { $sum: '$amount' },
      },
    },
  ]);

  const map = new Map<string, { income: number; expense: number }>();
  for (const k of monthKeysBack(now, months)) {
    map.set(k, { income: 0, expense: 0 });
  }
  for (const r of rows) {
    const bucket = map.get(r._id.month);
    if (!bucket) continue;
    if (r._id.type === 'credit') bucket.income = r.total;
    else bucket.expense = r.total;
  }
  return Array.from(map.entries()).map(([month, v]) => ({ month, ...v }));
}

/**
 * Categories where the last 30 days of spending > 130% of the 30-day average
 * across the prior 90 days. Rolling windows (not calendar-aligned) so users
 * with sparse or partial-month data still see meaningful comparisons.
 */
export async function spendingSpikes(
  month?: string | null,
): Promise<Array<{ category: string; current: number; average: number; ratio: number }>> {
  const userId = await requireUser();
  const now = month ? new Date(`${month}-01T00:00:00Z`) : new Date();
  const recentStart = month ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)) : new Date(now.getTime() - 30 * 86_400_000);
  const compareStart = month ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0)) : new Date(now.getTime() - 120 * 86_400_000);

  const [current, past] = await Promise.all([
    Transaction.aggregate<{ _id: string; total: number }>([
      {
        $match: {
          userId,
          type: 'debit',
          date: { $gte: recentStart },
          category: { $nin: EXCLUDE_FROM_TOTALS },
        },
      },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate<{ _id: string; total: number }>([
      {
        $match: {
          userId,
          type: 'debit',
          date: { $gte: compareStart, $lt: recentStart },
          category: { $nin: EXCLUDE_FROM_TOTALS },
        },
      },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]),
  ]);

  // past window is 90 days → normalize to a 30-day-equivalent average
  const pastMap = new Map(past.map((p) => [p._id, p.total / 3]));
  return current
    .map((c) => {
      const avg = pastMap.get(c._id) ?? 0;
      const ratio = avg > 0 ? c.total / avg : 0;
      return { category: c._id, current: c.total, average: avg, ratio };
    })
    .filter((x) => x.ratio >= 1.3 && x.current > 500)
    .sort((a, b) => b.ratio - a.ratio);
}

/**
 * Subscription detector — recurring transactions.
 *
 * Heuristic: group debit transactions by merchantName + amount (rounded to
 * nearest ₹10). Flag as a subscription when ≥3 hits with an average gap of
 * 20-40 days. Also captures the last-seen date so the UI can warn about
 * subscriptions that haven't triggered recently.
 */
export async function detectSubscriptions(
  month?: string | null,
): Promise<
  Array<{
    merchant: string;
    category: string;
    amount: number;
    count: number;
    lastSeen: Date;
    monthlyEstimate: number;
    stale: boolean;
  }>
> {
  const userId = await requireUser();
  const range = month ? monthRangeForFilter(month) : null;
  const sixMonthsAgo = range ? range.start : new Date();
  if (!range) sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const rows = await Transaction.find({
    userId,
    type: 'debit',
    date: range ? { $gte: range.start, $lte: range.end } : { $gte: sixMonthsAgo },
    merchantName: { $exists: true, $ne: null },
  })
    .select({ merchantName: 1, amount: 1, date: 1, category: 1 })
    .lean();

  type Group = { merchant: string; amount: number; category: string; dates: Date[] };
  const groups = new Map<string, Group>();
  for (const t of rows) {
    if (!t.merchantName) continue;
    const bucket = Math.round(t.amount / 10) * 10;
    const key = `${t.merchantName}|${bucket}`;
    if (!groups.has(key)) {
      groups.set(key, {
        merchant: t.merchantName,
        amount: bucket,
        category: t.category,
        dates: [],
      });
    }
    groups.get(key)!.dates.push(new Date(t.date));
  }

  const now = Date.now();
  const results: Awaited<ReturnType<typeof detectSubscriptions>> = [];
  for (const g of groups.values()) {
    if (g.dates.length < 3) continue;
    g.dates.sort((a, b) => a.getTime() - b.getTime());
    const gaps: number[] = [];
    for (let i = 1; i < g.dates.length; i++) {
      gaps.push(
        (g.dates[i].getTime() - g.dates[i - 1].getTime()) / (1000 * 60 * 60 * 24),
      );
    }
    const avgGap = gaps.reduce((s, x) => s + x, 0) / gaps.length;
    if (avgGap < 20 || avgGap > 40) continue;

    const lastSeen = g.dates[g.dates.length - 1];
    const daysSinceLast = (now - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
    results.push({
      merchant: g.merchant,
      category: g.category,
      amount: g.amount,
      count: g.dates.length,
      lastSeen,
      monthlyEstimate: g.amount, // ~monthly by definition of the gap window
      stale: daysSinceLast > 40,
    });
  }

  return results.sort((a, b) => b.monthlyEstimate - a.monthlyEstimate);
}

/* ============================================================ Bill Reminder
 * Predicts the next expected date for every recurring merchant and returns
 * anything due within a rolling window. Reuses the same "≥3 hits at similar
 * ₹ over a monthly-ish cadence" heuristic as detectSubscriptions, but here
 * we ADD a projected next-date and a status band the UI can color-code.
 * ============================================================ */

export type UpcomingBill = {
  merchant: string;
  category: string;
  amount: number;
  lastSeen: Date;
  nextExpected: Date;
  daysUntilDue: number; // negative = overdue
  medianGapDays: number;
  hits: number;
  status: 'overdue' | 'due-soon' | 'upcoming';
};

/** Median of a numeric array. Used for gap prediction — robust to outliers. */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Bills / subscriptions due within `withinDays` from today.
 * `status`:
 *   - overdue    : expected date has passed and no matching debit landed
 *   - due-soon   : expected within the next 7 days
 *   - upcoming   : expected 8–`withinDays` days out
 *
 * Anything expected beyond `withinDays` is skipped (too far to remind).
 * Merchants that have been silent >90 days since last hit are treated as
 * cancelled and excluded — no false "overdue by 200 days" noise.
 */
export async function detectUpcomingBills(
  withinDays = 30,
): Promise<UpcomingBill[]> {
  const userId = await requireUser();
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  const rows = await Transaction.find({
    userId,
    type: 'debit',
    date: { $gte: sixMonthsAgo },
    merchantName: { $exists: true, $ne: null },
  })
    .select({ merchantName: 1, amount: 1, date: 1, category: 1 })
    .lean();

  type Group = {
    merchant: string;
    amount: number;
    category: string;
    dates: Date[];
  };
  const groups = new Map<string, Group>();
  for (const t of rows) {
    if (!t.merchantName) continue;
    const bucket = Math.round(t.amount / 10) * 10;
    const key = `${t.merchantName}|${bucket}`;
    if (!groups.has(key)) {
      groups.set(key, {
        merchant: t.merchantName,
        amount: bucket,
        category: t.category,
        dates: [],
      });
    }
    groups.get(key)!.dates.push(new Date(t.date));
  }

  const bills: UpcomingBill[] = [];
  const nowMs = now.getTime();
  const DAY_MS = 86_400_000;

  for (const g of groups.values()) {
    if (g.dates.length < 3) continue;
    g.dates.sort((a, b) => a.getTime() - b.getTime());

    const gaps: number[] = [];
    for (let i = 1; i < g.dates.length; i++) {
      gaps.push((g.dates[i].getTime() - g.dates[i - 1].getTime()) / DAY_MS);
    }
    const avgGap = gaps.reduce((s, x) => s + x, 0) / gaps.length;
    // Monthly-ish (20–40 days) OR quarterly-ish (75–105 days) OR annual-ish (330-400 days)
    const cadenceOk =
      (avgGap >= 20 && avgGap <= 40) ||
      (avgGap >= 75 && avgGap <= 105) ||
      (avgGap >= 330 && avgGap <= 400);
    if (!cadenceOk) continue;

    const medianGapDays = median(gaps);
    const lastSeen = g.dates[g.dates.length - 1];
    const daysSinceLast = (nowMs - lastSeen.getTime()) / DAY_MS;

    // Merchant silent for >90 days beyond its expected gap → likely cancelled.
    if (daysSinceLast > medianGapDays + 90) continue;

    const nextExpected = new Date(lastSeen.getTime() + medianGapDays * DAY_MS);
    const daysUntilDue = Math.round(
      (nextExpected.getTime() - nowMs) / DAY_MS,
    );

    // Skip bills that are too far out — no value reminding today.
    if (daysUntilDue > withinDays) continue;
    // Skip already-paid: if there's a hit AFTER the previous "nextExpected"
    // window closed, the current lastSeen IS that payment → daysUntilDue is
    // essentially the next cycle. We keep those since they're the reminder.

    let status: UpcomingBill['status'];
    if (daysUntilDue < 0) status = 'overdue';
    else if (daysUntilDue <= 7) status = 'due-soon';
    else status = 'upcoming';

    bills.push({
      merchant: g.merchant,
      category: g.category,
      amount: g.amount,
      lastSeen,
      nextExpected,
      daysUntilDue,
      medianGapDays: Math.round(medianGapDays),
      hits: g.dates.length,
      status,
    });
  }

  // Sort by urgency: overdue first (most-overdue first), then due-soon, then upcoming
  return bills.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

/* =========================================================== Peer benchmark
 * Compares the current user's spending % vs illustrative Indian peer data.
 * The bracket is either passed by the UI (dropdown) or inferred from the
 * user's median monthly income across the last 3 months.
 * =========================================================== */

import {
  bracketForMonthlyIncome,
  bracketLabel,
  PEER_BENCHMARKS,
  type IncomeBracket,
} from '@/lib/benchmarks';

export type BenchmarkRow = {
  category: string;
  userPct: number; // % of user's monthly income
  peerPct: number; // % from the bracket table
  delta: number; // userPct - peerPct
  verdict: 'above' | 'below' | 'on-par';
};

export type BenchmarkResult = {
  bracket: IncomeBracket;
  bracketLabel: string;
  userMonthlyIncome: number;
  userMonthlyExpense: number;
  detectedFromData: boolean; // did we auto-pick the bracket from user income?
  rows: BenchmarkRow[];
  disclaimer: string;
};

export async function getBenchmarkComparison(
  overrideBracket?: IncomeBracket,
): Promise<BenchmarkResult> {
  const userId = await requireUser();
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);

  // Compute median monthly income + monthly-category expense over last 3 months.
  const [incomePerMonth, expensePerCat] = await Promise.all([
    Transaction.aggregate<{ _id: string; total: number }>([
      {
        $match: {
          userId,
          type: 'credit',
          date: { $gte: threeMonthsAgo },
          category: { $nin: EXCLUDE_FROM_TOTALS },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          total: { $sum: '$amount' },
        },
      },
    ]),
    Transaction.aggregate<{ _id: string; total: number }>([
      {
        $match: {
          userId,
          type: 'debit',
          date: { $gte: threeMonthsAgo },
          category: { $nin: EXCLUDE_FROM_TOTALS },
        },
      },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]),
  ]);

  const monthlyIncomes = incomePerMonth.map((r) => r.total);
  const monthlyIncome = median(monthlyIncomes); // ₹/month
  // For percentages we normalize the 3-month totals to per-month figures.
  const monthsCovered = Math.max(1, monthlyIncomes.length);
  const monthlyExpense =
    expensePerCat.reduce((s, r) => s + r.total, 0) / monthsCovered;

  const detectedFromData = !overrideBracket && monthlyIncome > 0;
  const bracket = overrideBracket ?? bracketForMonthlyIncome(monthlyIncome);
  const peerTable = PEER_BENCHMARKS[bracket];

  // Denominator for user's percentages: their own income if we have it,
  // else their monthly expense (so the chart is still meaningful).
  const denom = monthlyIncome > 0 ? monthlyIncome : monthlyExpense || 1;

  const userSpendMap = new Map(
    expensePerCat.map((r) => [r._id, r.total / monthsCovered]),
  );

  // Build rows for every category the peer table cares about.
  const rows: BenchmarkRow[] = Object.entries(peerTable)
    .map(([category, peerPct]) => {
      const userSpend = userSpendMap.get(category) ?? 0;
      const userPct = (userSpend / denom) * 100;
      const delta = userPct - (peerPct ?? 0);
      const verdict: BenchmarkRow['verdict'] =
        delta > 3 ? 'above' : delta < -3 ? 'below' : 'on-par';
      return {
        category,
        userPct: Math.round(userPct * 10) / 10,
        peerPct: peerPct ?? 0,
        delta: Math.round(delta * 10) / 10,
        verdict,
      };
    })
    .sort((a, b) => b.peerPct - a.peerPct);

  return {
    bracket,
    bracketLabel: bracketLabel(bracket),
    userMonthlyIncome: monthlyIncome,
    userMonthlyExpense: monthlyExpense,
    detectedFromData,
    rows,
    disclaimer:
      'Peer figures are illustrative averages for Indian urban households, based on aggregated public survey data — not live users of this app.',
  };
}

/* --------------------------------------------------------- Health score -- */

export type HealthScore = {
  total: number; // 0-100
  breakdown: {
    savings: number; // 0-30
    budgetAdherence: number; // 0-25
    stability: number; // 0-20
    subscriptions: number; // 0-15
    emergencyFund: number; // 0-10
    solvencyPenalty: number; // 0 or negative — pulls total down
  };
  metrics: {
    income: number;
    expense: number;
    savingsRate: number;
    subscriptionRatio: number;
    subscriptionTotal: number;
    budgetsTotal: number;
    budgetsMet: number;
    stabilityCv: number;
    goalProgress: number;
  };
};

/** Coefficient of variation for expense across months (lower = more stable). */
function coefficientOfVariation(values: number[]): number {
  const nonZero = values.filter((v) => v > 0);
  if (nonZero.length < 2) return 0;
  const mean = nonZero.reduce((s, x) => s + x, 0) / nonZero.length;
  if (mean === 0) return 0;
  const variance =
    nonZero.reduce((s, x) => s + (x - mean) ** 2, 0) / nonZero.length;
  return Math.sqrt(variance) / mean;
}

export async function computeHealthScore(options?: { month?: string | null }): Promise<HealthScore> {
  const userId = await requireUser();
  const month = options?.month ?? null;
  const now = month ? new Date(`${month}-01T00:00:00Z`) : new Date();
  const monthRange = monthRangeForFilter(month);
  const monthStart = monthRange ? monthRange.start : startOfMonth(now);
  const m = month ?? monthKey(now);

  // KPI totals span ALL user data (see header note on the dashboard). Budget
  // adherence still uses the current month because budgets are stored per month.
  const [trend, subs, monthBudgets, goals, totals] = await Promise.all([
    monthlyTrend(6, month),
    detectSubscriptions(month),
    Budget.find({ userId, month: m }).lean(),
    SavingsGoal.find({ userId }).lean(),
    Transaction.aggregate<{ _id: 'debit' | 'credit'; total: number }>([
      {
        $match: {
          userId,
          category: { $nin: EXCLUDE_FROM_TOTALS },
          ...(monthRange ? { date: { $gte: monthRange.start, $lte: monthRange.end } } : {}),
        },
      },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]),
  ]);

  const income = totals.find((r) => r._id === 'credit')?.total ?? 0;
  const expense = totals.find((r) => r._id === 'debit')?.total ?? 0;
  const savingsRate = income > 0 ? Math.max(0, (income - expense) / income) : 0;

  // Per-category actuals inside the selected month → budget adherence check.
  // Bounded when a specific month is picked so August budgets aren't compared
  // to September-plus totals.
  const spentThisMonth = monthRange
    ? await spendByCategoryBetween(monthRange.start, monthRange.end)
    : await spendByCategorySince(monthStart);
  const budgetsTotal = monthBudgets.length;
  const budgetsMet = monthBudgets.filter(
    (b) => (spentThisMonth[b.category] ?? 0) <= b.monthlyLimit,
  ).length;

  const cv = coefficientOfVariation(trend.map((t) => t.expense));
  const subscriptionTotal = subs.reduce((s, x) => s + x.monthlyEstimate, 0);
  const subscriptionRatio = expense > 0 ? subscriptionTotal / expense : 0;

  const goalProgress =
    goals.length === 0
      ? 0
      : goals.reduce(
          (s, g) => s + (g.currentAmount / Math.max(1, g.targetAmount)),
          0,
        ) / goals.length;

  // ---- scoring ----
  // A dimension without underlying signal gets a small "unknown" score
  // (roughly 25-30% of max) instead of a full neutral. Full points require
  // real data supporting a good outcome — the earlier neutral values were
  // rewarding empty setups.

  // Savings: linear 0-30, capped at savings rate of 40%+.
  const savings = Math.min(30, savingsRate * 75);

  // Budget adherence: fraction of budgets met × 25.
  // No budgets = 6/25 (nudge to set some, not a reward).
  const budgetAdherence =
    budgetsTotal === 0 ? 6 : (budgetsMet / budgetsTotal) * 25;

  // Stability: needs at least 2 months of expense history for the CV to mean
  // anything. Without that, give 6/20 rather than a fake 20/20.
  const monthsWithExpense = trend.filter((t) => t.expense > 0).length;
  const stability =
    monthsWithExpense < 2
      ? 6
      : Math.max(0, 20 * (1 - Math.min(1, cv)));

  // Subscriptions: <10% of expense = full 15; >40% = 0 (dependency risk).
  // No expense at all = 4/15 unknown.
  const subscriptions =
    expense === 0
      ? 4
      : subscriptionRatio <= 0.1
        ? 15
        : subscriptionRatio >= 0.4
          ? 0
          : 15 * (1 - (subscriptionRatio - 0.1) / 0.3);

  // Emergency fund: no goals set = 0. Set a goal and fund it to earn points.
  const emergencyFund = Math.min(10, goalProgress * 10);

  // ---- Solvency penalty ----
  // Great habits (budgeting, low subs) shouldn't hide the fact that you're
  // spending more than you earn. This penalty pulls the total down when the
  // fundamentals are broken. Always ≤ 0.
  //   * income = 0 with real spending  → up to −25
  //   * expense > income               → scaled by the overspend ratio, up to −25
  //   * healthy (income ≥ expense)     → 0
  let solvencyPenalty = 0;
  if (expense > 0) {
    if (income === 0) {
      solvencyPenalty = -25;
    } else if (expense > income) {
      const overspend = (expense - income) / income;
      solvencyPenalty = -Math.min(25, overspend * 25);
    }
  }

  const total = Math.round(
    savings +
      budgetAdherence +
      stability +
      subscriptions +
      emergencyFund +
      solvencyPenalty,
  );

  return {
    total: Math.max(0, Math.min(100, total)),
    breakdown: {
      savings: Math.round(savings),
      budgetAdherence: Math.round(budgetAdherence),
      stability: Math.round(stability),
      subscriptions: Math.round(subscriptions),
      emergencyFund: Math.round(emergencyFund),
      solvencyPenalty: Math.round(solvencyPenalty),
    },
    metrics: {
      income,
      expense,
      savingsRate,
      subscriptionRatio,
      subscriptionTotal,
      budgetsTotal,
      budgetsMet,
      stabilityCv: cv,
      goalProgress,
    },
  };
}

/* -------------------------------------------------- Insights (Gemini) -- */

/**
 * Per-user, in-process cache for Gemini recommendations. The dashboard
 * re-renders on every navigation and each render used to fire a fresh
 * generateContent() call — that burned the 15 req/min free-tier quota fast
 * and made every reload wait ~1-2s for AI. TTL is short enough (10 min) that
 * user data changes surface quickly.
 */
type RecEntry = { at: number; recs: string[] };
const RECS_TTL_MS = 10 * 60 * 1000;
const globalForRecs = globalThis as unknown as { _recCache?: Map<string, RecEntry> };
const recCache = globalForRecs._recCache ?? new Map<string, RecEntry>();
globalForRecs._recCache = recCache;

/**
 * Distinct YYYY-MM values the current user has at least one transaction in,
 * newest month first. Populates the month-selector dropdown.
 */
export async function listAvailableMonths(): Promise<string[]> {
  const userId = await requireUser();
  const rows = await Transaction.aggregate<{ _id: string }>([
    { $match: { userId } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } } } },
    { $sort: { _id: -1 } },
  ]);
  return rows.map((r) => r._id);
}

export async function generateAiRecommendations(month?: string | null): Promise<string[]> {
  const userId = String(await requireUser());
  const cached = recCache.get(`${userId}:${month ?? 'all'}`);
  if (cached && Date.now() - cached.at < RECS_TTL_MS) {
    return cached.recs;
  }

  const [score, top, trend] = await Promise.all([
    computeHealthScore({ month }),
    topCategories(5, month),
    monthlyTrend(3, month),
  ]);
  const recs = await generateRecommendations({
    income: score.metrics.income,
    totalExpense: score.metrics.expense,
    savingsRate: score.metrics.savingsRate,
    topCategories: top,
    monthlyTrend: trend.map((t) => ({ month: t.month, expense: t.expense })),
  });
  // Only cache non-empty results — empty [] is usually a 503 or missing key,
  // and we want to retry on the next request instead of pinning a blank card.
  if (recs.length > 0) {
    recCache.set(`${userId}:${month ?? 'all'}`, { at: Date.now(), recs });
  }
  return recs;
}
