'use server';

import mongoose from 'mongoose';
import { connectDb } from '@/db';
import { Transaction, Budget, SavingsGoal } from '@/db/models';
import { auth } from '@/lib/auth';
import { generateRecommendations } from '@/lib/gemini';
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

/** Top N spending categories across ALL user data, largest first. */
export async function topCategories(
  limit = 6,
): Promise<Array<{ category: string; amount: number }>> {
  const userId = await requireUser();
  const rows = await Transaction.aggregate<{ _id: string; total: number }>([
    {
      $match: {
        userId,
        type: 'debit',
        category: { $nin: EXCLUDE_FROM_TOTALS },
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
): Promise<Array<{ month: string; income: number; expense: number }>> {
  const userId = await requireUser();
  const now = new Date();
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
export async function spendingSpikes(): Promise<
  Array<{ category: string; current: number; average: number; ratio: number }>
> {
  const userId = await requireUser();
  const now = new Date();
  const recentStart = new Date(now.getTime() - 30 * 86_400_000);
  const compareStart = new Date(now.getTime() - 120 * 86_400_000);

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
export async function detectSubscriptions(): Promise<
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
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const rows = await Transaction.find({
    userId,
    type: 'debit',
    date: { $gte: sixMonthsAgo },
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

export async function computeHealthScore(): Promise<HealthScore> {
  const userId = await requireUser();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const m = monthKey(now);

  // KPI totals span ALL user data (see header note on the dashboard). Budget
  // adherence still uses the current month because budgets are stored per month.
  const [trend, subs, monthBudgets, goals, totals] = await Promise.all([
    monthlyTrend(6),
    detectSubscriptions(),
    Budget.find({ userId, month: m }).lean(),
    SavingsGoal.find({ userId }).lean(),
    Transaction.aggregate<{ _id: 'debit' | 'credit'; total: number }>([
      {
        $match: {
          userId,
          category: { $nin: EXCLUDE_FROM_TOTALS },
        },
      },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]),
  ]);

  const income = totals.find((r) => r._id === 'credit')?.total ?? 0;
  const expense = totals.find((r) => r._id === 'debit')?.total ?? 0;
  const savingsRate = income > 0 ? Math.max(0, (income - expense) / income) : 0;

  // Per-category actuals for the CURRENT month → budget adherence check.
  const spentThisMonth = await spendByCategorySince(monthStart);
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

export async function generateAiRecommendations(): Promise<string[]> {
  const userId = String(await requireUser());
  const cached = recCache.get(userId);
  if (cached && Date.now() - cached.at < RECS_TTL_MS) {
    return cached.recs;
  }

  const [score, top, trend] = await Promise.all([
    computeHealthScore(),
    topCategories(5),
    monthlyTrend(3),
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
    recCache.set(userId, { at: Date.now(), recs });
  }
  return recs;
}
