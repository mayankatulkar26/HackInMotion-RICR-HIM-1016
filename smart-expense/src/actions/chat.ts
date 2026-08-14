'use server';

import mongoose from 'mongoose';
import { format } from 'date-fns';
import { connectDb } from '@/db';
import { Transaction } from '@/db/models';
import { auth } from '@/lib/auth';
import { chatWithData } from '@/lib/gemini';
import {
  computeHealthScore,
  detectSubscriptions,
  monthlyTrend,
  topCategories,
} from './analysis';
import { formatCurrency } from '@/lib/utils';

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');
  await connectDb();
  return new mongoose.Types.ObjectId(session.user.id);
}

const EXCLUDE_FROM_TOTALS = ['Transfer'];

/**
 * Answer a user's question about their finances.
 *
 * The context we build is intentionally *rich* — top-line metrics AND
 * specific rows — so the model can answer questions like "how much at
 * BigBasket in July?" or "what did I spend on Aug 5?" rather than only
 * high-level questions.
 *
 * Sections included:
 *   • Top-line KPIs (all-time income / expense / savings rate / health score)
 *   • Top spending categories (all-time)
 *   • Monthly trend (last 6 months, income + expense)
 *   • Per-month × per-category breakdown (last 3 months) — pivots for
 *     questions like "food spend last month"
 *   • Top merchants (by ₹ across all-time, capped at 15)
 *   • Recent transactions (last 40 rows) — for date-specific questions
 *   • Detected subscriptions
 *
 * We keep the token footprint bounded — never send the whole transaction
 * table, which would blow past model context limits and cost budgets.
 */
export async function askQuestion(question: string): Promise<string> {
  const q = question.trim();
  if (!q) return 'Please ask a question.';
  if (q.length > 500) {
    return 'Please keep your question under 500 characters.';
  }

  const userId = await requireUser();

  const [
    score,
    top,
    trend,
    subs,
    recentTxDocs,
    topMerchants,
    monthCategoryMatrix,
  ] = await Promise.all([
    computeHealthScore(),
    topCategories(10),
    monthlyTrend(6),
    detectSubscriptions(),
    // Last 60 transactions — we'll filter junk descriptions client-side
    // and cap to 15, so 60 gives us enough headroom for skips.
    Transaction.find({ userId })
      .sort({ date: -1 })
      .limit(60)
      .select({ date: 1, description: 1, amount: 1, type: 1, category: 1 })
      .lean(),
    // Top 15 merchants by absolute spend across all-time
    Transaction.aggregate<{
      _id: string;
      count: number;
      totalDebit: number;
      totalCredit: number;
    }>([
      {
        $match: {
          userId,
          merchantName: { $exists: true, $ne: null },
          category: { $nin: EXCLUDE_FROM_TOTALS },
        },
      },
      {
        $group: {
          _id: '$merchantName',
          count: { $sum: 1 },
          totalDebit: {
            $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] },
          },
          totalCredit: {
            $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] },
          },
        },
      },
      {
        $addFields: {
          absTotal: { $add: ['$totalDebit', '$totalCredit'] },
        },
      },
      { $sort: { absTotal: -1 } },
      { $limit: 15 },
    ]),
    // Per-month per-category debit matrix, last 3 months
    Transaction.aggregate<{
      _id: { month: string; category: string };
      total: number;
    }>([
      {
        $match: {
          userId,
          type: 'debit',
          category: { $nin: EXCLUDE_FROM_TOTALS },
          date: {
            $gte: new Date(
              new Date().getFullYear(),
              new Date().getMonth() - 2,
              1,
            ),
          },
        },
      },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: '%Y-%m', date: '$date' } },
            category: '$category',
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.month': -1, total: -1 } },
    ]),
  ]);

  /* -------------------- format each section for the prompt -------------------- */

  const lines: string[] = [];

  lines.push('=== TOP-LINE (all-time, transfers excluded) ===');
  lines.push(`Total income:  ${formatCurrency(score.metrics.income)}`);
  lines.push(`Total expense: ${formatCurrency(score.metrics.expense)}`);
  lines.push(`Savings rate:  ${(score.metrics.savingsRate * 100).toFixed(1)}%`);
  lines.push(`Health score:  ${score.total}/100`);
  lines.push('');

  lines.push('=== TOP SPENDING CATEGORIES (all-time) ===');
  if (top.length === 0) {
    lines.push('(none)');
  } else {
    for (const t of top) {
      lines.push(`  ${t.category}: ${formatCurrency(t.amount)}`);
    }
  }
  lines.push('');

  lines.push('=== MONTHLY TREND (last 6 months) ===');
  for (const t of trend) {
    lines.push(
      `  ${t.month}: income ${formatCurrency(t.income)}, expense ${formatCurrency(t.expense)}`,
    );
  }
  lines.push('');

  // Pivot the matrix into per-month lists
  lines.push('=== BREAKDOWN BY MONTH × CATEGORY (last 3 months, debits only) ===');
  const byMonth = new Map<string, Array<{ category: string; total: number }>>();
  for (const row of monthCategoryMatrix) {
    const bucket = byMonth.get(row._id.month) ?? [];
    bucket.push({ category: row._id.category, total: row.total });
    byMonth.set(row._id.month, bucket);
  }
  const monthsSorted = [...byMonth.keys()].sort().reverse();
  for (const m of monthsSorted) {
    lines.push(`  ${m}:`);
    for (const c of byMonth.get(m)!) {
      lines.push(`    - ${c.category}: ${formatCurrency(c.total)}`);
    }
  }
  if (monthsSorted.length === 0) lines.push('  (no data)');
  lines.push('');

  lines.push('=== TOP MERCHANTS (all-time, by ₹) ===');
  if (topMerchants.length === 0) {
    lines.push('(none)');
  } else {
    for (const m of topMerchants) {
      const net =
        m.totalDebit > m.totalCredit
          ? `spent ${formatCurrency(m.totalDebit)}`
          : `received ${formatCurrency(m.totalCredit)}`;
      lines.push(`  ${m._id}: ${net} across ${m.count} tx`);
    }
  }
  lines.push('');

  // Filter useless descriptions (pure time fragments left by bad PDF parses,
  // empty strings, single chars) and near-duplicate rows so the model
  // doesn't see 40 identical "01 15 pm" entries and loop.
  const isJunkDesc = (d: string) => {
    const s = d.trim();
    if (s.length < 3) return true;
    if (/^\d{1,2}[\s:]\d{2}(?:[\s:]\d{2})?\s*(?:am|pm)?$/i.test(s)) return true;
    return false;
  };
  const seen = new Set<string>();
  const cleanRecent: typeof recentTxDocs = [];
  for (const t of recentTxDocs) {
    if (isJunkDesc(t.description)) continue;
    const key = `${format(new Date(t.date), 'yyyy-MM-dd')}|${t.category}|${t.amount}|${t.description.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cleanRecent.push(t);
    if (cleanRecent.length >= 15) break;
  }

  lines.push(
    `=== RECENT TRANSACTIONS (${cleanRecent.length} most recent, newest first) ===`,
  );
  if (cleanRecent.length === 0) {
    lines.push('(none)');
  } else {
    for (const t of cleanRecent) {
      const sign = t.type === 'credit' ? '+' : '-';
      lines.push(
        `  ${format(new Date(t.date), 'yyyy-MM-dd')} · ${t.category} · ${sign}${formatCurrency(t.amount)} · ${t.description.trim()}`,
      );
    }
  }
  lines.push('');

  lines.push(
    subs.length > 0
      ? `=== DETECTED SUBSCRIPTIONS (${subs.length} total, ~${formatCurrency(
          subs.reduce((s, x) => s + x.monthlyEstimate, 0),
        )}/month) ===`
      : '=== DETECTED SUBSCRIPTIONS ===\n(none detected)',
  );
  for (const s of subs.slice(0, 10)) {
    lines.push(
      `  ${s.merchant} (${s.category}): ${formatCurrency(s.amount)} · ${s.count} hits${s.stale ? ' · STALE' : ''}`,
    );
  }

  return chatWithData(q, lines.join('\n'));
}
