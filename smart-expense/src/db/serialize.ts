import type {
  TransactionDoc,
  BudgetDoc,
  SavingsGoalDoc,
  Transaction,
  Budget,
  SavingsGoal,
} from './models';

/**
 * Server -> Client boundary helpers. Mongoose docs contain ObjectId / methods
 * that Next.js can't serialize across the server-component boundary; these
 * functions strip everything down to plain data with `id: string`.
 */
export function toTransaction(d: TransactionDoc): Transaction {
  return {
    id: String(d._id),
    userId: String(d.userId),
    accountId: d.accountId ? String(d.accountId) : null,
    amount: d.amount,
    type: d.type,
    date: new Date(d.date),
    description: d.description,
    merchantName: d.merchantName ?? null,
    category: d.category,
    isRecurring: Boolean(d.isRecurring),
    dedupeHash: d.dedupeHash,
    createdAt: new Date(d.createdAt),
  };
}

export function toBudget(d: BudgetDoc): Budget {
  return {
    id: String(d._id),
    userId: String(d.userId),
    category: d.category,
    monthlyLimit: d.monthlyLimit,
    month: d.month,
    createdAt: new Date(d.createdAt),
  };
}

export function toSavingsGoal(d: SavingsGoalDoc): SavingsGoal {
  return {
    id: String(d._id),
    userId: String(d.userId),
    name: d.name,
    targetAmount: d.targetAmount,
    currentAmount: d.currentAmount,
    deadline: d.deadline ? new Date(d.deadline) : null,
    createdAt: new Date(d.createdAt),
  };
}
