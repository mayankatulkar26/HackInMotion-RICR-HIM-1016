'use server';

import { z } from 'zod';
import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { connectDb } from '@/db';
import {
  Budget,
  SavingsGoal,
  type Budget as BudgetOut,
  type SavingsGoal as GoalOut,
} from '@/db/models';
import { toBudget, toSavingsGoal } from '@/db/serialize';
import { auth } from '@/lib/auth';
import { CATEGORIES } from '@/lib/categories';
import { monthKey } from '@/lib/utils';

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not authenticated');
  await connectDb();
  return new mongoose.Types.ObjectId(session.user.id);
}

const budgetSchema = z.object({
  category: z.enum(CATEGORIES),
  monthlyLimit: z.number().positive(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export async function upsertBudget(input: z.infer<typeof budgetSchema>) {
  const userId = await requireUser();
  const parsed = budgetSchema.parse(input);
  const month = parsed.month ?? monthKey();

  await Budget.updateOne(
    { userId, category: parsed.category, month },
    { $set: { monthlyLimit: parsed.monthlyLimit } },
    { upsert: true },
  );

  revalidatePath('/budgets');
  revalidatePath('/dashboard');
  return { ok: true as const };
}

export async function deleteBudget(id: string) {
  const userId = await requireUser();
  await Budget.deleteOne({ _id: id, userId });
  revalidatePath('/budgets');
  return { ok: true as const };
}

export async function listBudgets(month?: string): Promise<BudgetOut[]> {
  const userId = await requireUser();
  const m = month ?? monthKey();
  const docs = await Budget.find({ userId, month: m }).lean();
  return docs.map((d) => toBudget(d as any));
}

const goalSchema = z.object({
  name: z.string().min(1).max(100),
  targetAmount: z.number().positive(),
  currentAmount: z.number().nonnegative().optional(),
  deadline: z.string().optional(),
});

export async function upsertGoal(
  input: z.infer<typeof goalSchema> & { id?: string },
) {
  const userId = await requireUser();
  const parsed = goalSchema.parse(input);
  const deadline = parsed.deadline ? new Date(parsed.deadline) : null;

  if (input.id) {
    await SavingsGoal.updateOne(
      { _id: input.id, userId },
      {
        $set: {
          name: parsed.name,
          targetAmount: parsed.targetAmount,
          currentAmount: parsed.currentAmount ?? 0,
          deadline,
        },
      },
    );
  } else {
    await SavingsGoal.create({
      userId,
      name: parsed.name,
      targetAmount: parsed.targetAmount,
      currentAmount: parsed.currentAmount ?? 0,
      deadline,
    });
  }
  revalidatePath('/budgets');
  revalidatePath('/dashboard');
  return { ok: true as const };
}

export async function deleteGoal(id: string) {
  const userId = await requireUser();
  await SavingsGoal.deleteOne({ _id: id, userId });
  revalidatePath('/budgets');
  return { ok: true as const };
}

export async function listGoals(): Promise<GoalOut[]> {
  const userId = await requireUser();
  const docs = await SavingsGoal.find({ userId }).lean();
  return docs.map((d) => toSavingsGoal(d as any));
}
