'use server';

import { chatWithData } from '@/lib/gemini';
import {
  computeHealthScore,
  detectSubscriptions,
  monthlyTrend,
  topCategories,
} from './analysis';
import { formatCurrency } from '@/lib/utils';

/**
 * Answer a user's question about their finances by:
 *   1. gathering a compact snapshot from their data (categories, trend, subs, score)
 *   2. handing that context + the question to Gemini
 *   3. returning a grounded natural-language answer
 *
 * Without a GEMINI_API_KEY the underlying helper returns a helpful message
 * explaining the missing env var — no exception here.
 */
export async function askQuestion(question: string): Promise<string> {
  const q = question.trim();
  if (!q) return 'Please ask a question.';
  if (q.length > 500) {
    return 'Please keep your question under 500 characters.';
  }

  const [score, top, trend, subs] = await Promise.all([
    computeHealthScore(),
    topCategories(8),
    monthlyTrend(6),
    detectSubscriptions(),
  ]);

  const context = [
    `Current month income: ${formatCurrency(score.metrics.income)}`,
    `Current month expenses: ${formatCurrency(score.metrics.expense)}`,
    `Savings rate: ${(score.metrics.savingsRate * 100).toFixed(1)}%`,
    `Health score: ${score.total}/100`,
    '',
    'Top spending categories this month:',
    ...top.map((t) => `  - ${t.category}: ${formatCurrency(t.amount)}`),
    '',
    'Monthly totals (last 6 months):',
    ...trend.map(
      (t) =>
        `  - ${t.month}: income ${formatCurrency(t.income)}, expense ${formatCurrency(t.expense)}`,
    ),
    '',
    subs.length > 0
      ? `Detected subscriptions (${subs.length} total, ~${formatCurrency(
          subs.reduce((s, x) => s + x.monthlyEstimate, 0),
        )}/month):`
      : 'No recurring subscriptions detected.',
    ...subs
      .slice(0, 8)
      .map(
        (s) =>
          `  - ${s.merchant} (${s.category}): ${formatCurrency(s.amount)} · ${s.count} hits${s.stale ? ' · STALE' : ''}`,
      ),
  ].join('\n');

  return chatWithData(q, context);
}
