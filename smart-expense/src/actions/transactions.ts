'use server';

import { z } from 'zod';
import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { connectDb } from '@/db';
import { Transaction, MerchantCache, type Transaction as TransactionOut } from '@/db/models';
import { toTransaction } from '@/db/serialize';
import { auth } from '@/lib/auth';
import { CATEGORIES } from '@/lib/categories';
import {
  extractMerchantKey,
  ruleBasedCategorize,
} from '@/lib/categorizer';
import { categorizeWithGemini } from '@/lib/gemini';
import { dedupeHash, type ParsedRow } from '@/lib/csv';

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');
  await connectDb();
  return new mongoose.Types.ObjectId(session.user.id);
}

const manualSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1).max(200),
  category: z.enum(CATEGORIES).optional(),
  type: z.enum(['debit', 'credit']),
  date: z.string().min(1),
});

export type ManualInput = z.infer<typeof manualSchema>;

export async function addTransaction(input: ManualInput) {
  const userId = await requireUser();
  const parsed = manualSchema.parse(input);
  const date = new Date(parsed.date);

  const category =
    parsed.category ??
    ruleBasedCategorize(parsed.description) ??
    'Uncategorized';

  await Transaction.create({
    userId,
    amount: parsed.amount,
    description: parsed.description,
    category,
    type: parsed.type,
    date,
    merchantName: extractMerchantKey(parsed.description),
    dedupeHash: dedupeHash({
      amount: parsed.amount,
      date,
      description: parsed.description,
    }),
  });

  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  return { ok: true as const };
}

export async function deleteTransaction(id: string) {
  const userId = await requireUser();
  await Transaction.deleteOne({ _id: id, userId });
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  return { ok: true as const };
}

export type ImportSummary = {
  inserted: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  categorizedByRule: number;
  categorizedByAI: number;
};

/**
 * Bulk-import parsed CSV rows. Steps:
 *   1. Filter rows with warnings that make them un-importable.
 *   2. Dedupe against existing user transactions (by dedupeHash).
 *   3. Rule-based categorize.
 *   4. Batch remaining "Uncategorized" through Gemini (cached by merchant).
 *   5. Insert all in one round-trip.
 */
export async function importTransactions(
  rows: Array<
    Pick<ParsedRow, 'date' | 'description' | 'amount' | 'type' | 'warnings'>
  >,
): Promise<ImportSummary> {
  const userId = await requireUser();

  const summary: ImportSummary = {
    inserted: 0,
    skippedDuplicates: 0,
    skippedInvalid: 0,
    categorizedByRule: 0,
    categorizedByAI: 0,
  };

  // Step 1: keep only rows with the essentials
  const valid = rows.filter((r) => {
    const bad = !r.date || !r.amount || !r.description;
    if (bad) summary.skippedInvalid++;
    return !bad;
  });
  if (valid.length === 0) return summary;

  // Step 2: dedupe
  const hashes = valid.map((r) =>
    dedupeHash({
      amount: r.amount!,
      date: new Date(r.date!),
      description: r.description,
    }),
  );

  const existing = await Transaction.find(
    { userId, dedupeHash: { $in: hashes } },
    { dedupeHash: 1 },
  ).lean();
  const seen = new Set(existing.map((e) => e.dedupeHash));

  const withHash = valid.map((r, i) => ({ ...r, hash: hashes[i] }));
  const fresh = withHash.filter((r) => {
    if (seen.has(r.hash)) {
      summary.skippedDuplicates++;
      return false;
    }
    return true;
  });
  if (fresh.length === 0) return summary;

  // Step 3: rule-based categorization
  type Staged = {
    userId: mongoose.Types.ObjectId;
    amount: number;
    description: string;
    category: string;
    type: 'debit' | 'credit';
    date: Date;
    merchantName: string;
    dedupeHash: string;
  };

  const staged: Staged[] = fresh.map((r) => {
    const rule = ruleBasedCategorize(r.description);
    if (rule) summary.categorizedByRule++;
    return {
      userId,
      amount: r.amount!,
      description: r.description,
      category: rule ?? 'Uncategorized',
      type: r.type,
      date: new Date(r.date!),
      merchantName: extractMerchantKey(r.description),
      dedupeHash: r.hash,
    };
  });

  // Step 4: Gemini for remaining Uncategorized (with merchant cache)
  const uncat = staged.filter((s) => s.category === 'Uncategorized');
  if (uncat.length > 0) {
    const merchants = Array.from(new Set(uncat.map((s) => s.merchantName)));
    const cached = merchants.length
      ? await MerchantCache.find({ merchantKey: { $in: merchants } }).lean()
      : [];
    const cacheMap = new Map(cached.map((c) => [c.merchantKey, c.category]));

    for (const s of uncat) {
      const hit = cacheMap.get(s.merchantName);
      if (hit) {
        s.category = hit;
        summary.categorizedByAI++;
      }
    }

    const stillUncat = staged.filter((s) => s.category === 'Uncategorized');

    if (stillUncat.length > 0) {
      for (let i = 0; i < stillUncat.length; i += 20) {
        const batch = stillUncat.slice(i, i + 20);
        const cats = await categorizeWithGemini(batch.map((b) => b.description));
        const newCacheEntries: Array<{ merchantKey: string; category: string }> = [];
        for (let j = 0; j < batch.length; j++) {
          const c = cats[j];
          if (c && c !== 'Uncategorized') {
            batch[j].category = c;
            summary.categorizedByAI++;
            if (!cacheMap.has(batch[j].merchantName)) {
              cacheMap.set(batch[j].merchantName, c);
              newCacheEntries.push({
                merchantKey: batch[j].merchantName,
                category: c,
              });
            }
          }
        }
        if (newCacheEntries.length) {
          try {
            // Upsert: if merchantKey already exists (concurrent import), skip silently.
            // ordered:false so a single duplicate doesn't abort the batch.
            await MerchantCache.insertMany(newCacheEntries, { ordered: false });
          } catch {
            // Duplicate-key errors from the unique index are expected under
            // concurrent imports — nothing else worth surfacing here.
          }
        }
      }
    }
  }

  // Step 5: bulk insert
  if (staged.length > 0) {
    await Transaction.insertMany(staged, { ordered: false });
    summary.inserted = staged.length;
  }

  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  return summary;
}

export async function listTransactions(opts?: {
  category?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<TransactionOut[]> {
  const userId = await requireUser();
  const filter: Record<string, unknown> = { userId };
  if (opts?.category && opts.category !== 'All') filter.category = opts.category;
  if (opts?.from || opts?.to) {
    const range: Record<string, Date> = {};
    if (opts.from) range.$gte = new Date(opts.from);
    if (opts.to) range.$lte = new Date(opts.to);
    filter.date = range;
  }

  const docs = await Transaction.find(filter)
    .sort({ date: -1 })
    .limit(opts?.limit ?? 500)
    .lean();
  return docs.map((d) => toTransaction(d as any));
}

export async function transactionStats() {
  const userId = await requireUser();
  const [res] = await Transaction.aggregate<{
    total: number;
    income: number;
    expense: number;
  }>([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        income: {
          $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] },
        },
        expense: {
          $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] },
        },
      },
    },
    { $project: { _id: 0 } },
  ]);
  return res ?? { total: 0, income: 0, expense: 0 };
}
