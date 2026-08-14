'use server';

import { z } from 'zod';
import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { connectDb } from '@/db';
import {
  Transaction,
  MerchantCache,
  ImportBatch,
  type Transaction as TransactionOut,
  type ImportBatch as ImportBatchOut,
} from '@/db/models';
import { toTransaction, toImportBatch } from '@/db/serialize';
import { auth } from '@/lib/auth';
import { CATEGORIES } from '@/lib/categories';
import {
  extractMerchantKey,
  ruleBasedCategorize,
} from '@/lib/categorizer';
import { categorizeWithGemini, isGeminiConfigured } from '@/lib/gemini';
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
  meta?: { fileName?: string; source?: 'csv' | 'excel' | 'pdf' },
): Promise<ImportSummary & { batchId: string | null }> {
  const userId = await requireUser();

  const summary: ImportSummary = {
    inserted: 0,
    skippedDuplicates: 0,
    skippedInvalid: 0,
    categorizedByRule: 0,
    categorizedByAI: 0,
  };
  let batchId: mongoose.Types.ObjectId | null = null;

  // Step 1: keep only rows with the essentials
  const valid = rows.filter((r) => {
    const bad = !r.date || !r.amount || !r.description;
    if (bad) summary.skippedInvalid++;
    return !bad;
  });
  if (valid.length === 0) return { ...summary, batchId: null };

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
  if (fresh.length === 0) return { ...summary, batchId: null };

  // Create a batch record first so we can attach batchId to each row.
  const batch = await ImportBatch.create({
    userId,
    name: meta?.fileName || `Import ${new Date().toLocaleString()}`,
    source: meta?.source ?? 'csv',
    fileName: meta?.fileName ?? null,
  });
  batchId = batch._id;

  // Step 3: rule-based categorization
  type Staged = {
    userId: mongoose.Types.ObjectId;
    batchId: mongoose.Types.ObjectId;
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
      batchId: batch._id,
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

  // Persist counts on the batch for the Transactions UI
  await ImportBatch.updateOne(
    { _id: batch._id },
    {
      $set: {
        inserted: summary.inserted,
        skippedDuplicates: summary.skippedDuplicates,
        skippedInvalid: summary.skippedInvalid,
        categorizedByRule: summary.categorizedByRule,
        categorizedByAI: summary.categorizedByAI,
      },
    },
  );

  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  return { ...summary, batchId: batchId ? String(batchId) : null };
}

export async function listTransactions(opts?: {
  category?: string;
  from?: string;
  to?: string;
  limit?: number;
  /** Statement filter — 'all' (default), 'manual' (null batchId), or a batch id. */
  batchId?: string | 'all' | 'manual';
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
  if (opts?.batchId === 'manual') {
    filter.batchId = null;
  } else if (opts?.batchId && opts.batchId !== 'all') {
    filter.batchId = new mongoose.Types.ObjectId(opts.batchId);
  }

  const docs = await Transaction.find(filter)
    .sort({ date: -1 })
    .limit(opts?.limit ?? 500)
    .lean();
  return docs.map((d) => toTransaction(d as any));
}

/** All statements this user has uploaded, plus a synthetic "Manual" bucket. */
export async function listBatches(): Promise<{
  batches: ImportBatchOut[];
  manualCount: number;
}> {
  const userId = await requireUser();
  const [docs, manualCount, counts] = await Promise.all([
    ImportBatch.find({ userId }).sort({ createdAt: -1 }).lean(),
    Transaction.countDocuments({ userId, batchId: null }),
    Transaction.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
      { $match: { userId, batchId: { $ne: null } } },
      { $group: { _id: '$batchId', n: { $sum: 1 } } },
    ]),
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.n]));
  const batches = docs.map((d) => {
    const b = toImportBatch(d as any);
    return { ...b, txCount: countMap.get(b.id) ?? 0 };
  });
  return { batches, manualCount };
}

export async function deleteBatch(id: string): Promise<{ removed: number }> {
  const userId = await requireUser();
  const oid = new mongoose.Types.ObjectId(id);
  const res = await Transaction.deleteMany({ userId, batchId: oid });
  await ImportBatch.deleteOne({ _id: oid, userId });
  revalidatePath('/transactions');
  revalidatePath('/dashboard');
  return { removed: res.deletedCount ?? 0 };
}

/**
 * Bulk delete for the Manual & legacy bucket (rows with no batchId — either
 * added by hand or imported before we started tracking batches).
 * Kept as a separate action from `deleteBatch` so it's harder to fire by mistake.
 */
export async function deleteManualTransactions(): Promise<{ removed: number }> {
  const userId = await requireUser();
  const res = await Transaction.deleteMany({ userId, batchId: null });
  revalidatePath('/transactions');
  revalidatePath('/dashboard');
  return { removed: res.deletedCount ?? 0 };
}

/**
 * Nuke everything for the current user: all transactions (across every batch
 * and the manual bucket) plus every ImportBatch record. Budgets, goals, and
 * merchant-cache entries are left alone so the user's setup survives.
 * The UI wraps this in a confirm() + type-to-confirm before firing.
 */
export async function deleteAllTransactions(): Promise<{
  removedTransactions: number;
  removedBatches: number;
}> {
  const userId = await requireUser();
  const [txRes, batchRes] = await Promise.all([
    Transaction.deleteMany({ userId }),
    ImportBatch.deleteMany({ userId }),
  ]);
  revalidatePath('/transactions');
  revalidatePath('/dashboard');
  revalidatePath('/insights');
  return {
    removedTransactions: txRes.deletedCount ?? 0,
    removedBatches: batchRes.deletedCount ?? 0,
  };
}

/**
 * Re-classify every transaction for the current user.
 * Runs the rule-based categorizer first, then falls back to the merchant
 * cache, then batches whatever's still Uncategorized/Transfer through Gemini
 * (if a key is configured). Only writes back to Mongo when the new category
 * actually differs from the stored one — keeps writes tight.
 */
export async function recategorizeAllTransactions(): Promise<{
  scanned: number;
  updatedByRule: number;
  updatedByAI: number;
}> {
  const userId = await requireUser();
  const all = await Transaction.find({ userId })
    .select({ description: 1, category: 1, merchantName: 1 })
    .lean();

  if (all.length === 0) {
    return { scanned: 0, updatedByRule: 0, updatedByAI: 0 };
  }

  // Warm the merchant cache once
  const merchants = Array.from(
    new Set(all.map((t) => t.merchantName).filter(Boolean) as string[]),
  );
  const cached = merchants.length
    ? await MerchantCache.find({ merchantKey: { $in: merchants } }).lean()
    : [];
  const cacheMap = new Map(cached.map((c) => [c.merchantKey, c.category]));

  const ruleUpdates: Array<{ id: mongoose.Types.ObjectId; category: string }> = [];
  const needsAi: Array<{ id: mongoose.Types.ObjectId; description: string; merchantName: string | null }> = [];

  for (const t of all) {
    const rule = ruleBasedCategorize(t.description);
    if (rule && rule !== t.category) {
      ruleUpdates.push({ id: t._id, category: rule });
      continue;
    }
    if (rule) continue; // rule agrees with current category

    // No rule match — try cache
    if (t.merchantName) {
      const hit = cacheMap.get(t.merchantName);
      if (hit && hit !== t.category) {
        ruleUpdates.push({ id: t._id, category: hit });
        continue;
      }
      if (hit) continue;
    }

    // Still unlabelled — queue for AI IF current is stale (Uncategorized/Transfer)
    if (t.category === 'Uncategorized' || t.category === 'Transfer') {
      needsAi.push({
        id: t._id,
        description: t.description,
        merchantName: t.merchantName ?? null,
      });
    }
  }

  // Apply rule-based updates in one round-trip
  if (ruleUpdates.length > 0) {
    await Transaction.bulkWrite(
      ruleUpdates.map((u) => ({
        updateOne: {
          filter: { _id: u.id },
          update: { $set: { category: u.category } },
        },
      })) as any,
    );
  }

  let updatedByAI = 0;

  // Fall through to Gemini for stubborn ones
  if (needsAi.length > 0 && isGeminiConfigured()) {
    const aiBulk: any[] = [];
    const newCacheEntries: Array<{ merchantKey: string; category: string }> = [];

    for (let i = 0; i < needsAi.length; i += 20) {
      const batch = needsAi.slice(i, i + 20);
      const cats = await categorizeWithGemini(batch.map((b) => b.description));
      for (let j = 0; j < batch.length; j++) {
        const c = cats[j];
        if (c && c !== 'Uncategorized') {
          aiBulk.push({
            updateOne: {
              filter: { _id: batch[j].id },
              update: { $set: { category: c } },
            },
          });
          updatedByAI++;
          if (batch[j].merchantName && !cacheMap.has(batch[j].merchantName!)) {
            cacheMap.set(batch[j].merchantName!, c);
            newCacheEntries.push({ merchantKey: batch[j].merchantName!, category: c });
          }
        }
      }
    }

    if (aiBulk.length > 0) await Transaction.bulkWrite(aiBulk);
    if (newCacheEntries.length > 0) {
      try {
        await MerchantCache.insertMany(newCacheEntries, { ordered: false });
      } catch {
        // Concurrent inserts hitting the unique index — safe to ignore.
      }
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  revalidatePath('/insights');
  return {
    scanned: all.length,
    updatedByRule: ruleUpdates.length,
    updatedByAI,
  };
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
