'use server';

import mongoose from 'mongoose';
import { connectDb } from '@/db';
import { Transaction } from '@/db/models';
import { auth } from '@/lib/auth';

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');
  await connectDb();
  return new mongoose.Types.ObjectId(session.user.id);
}

/**
 * Sum of debit transactions per category since `since`.
 * Used by /budgets to color-code progress bars against monthly limits.
 */
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
