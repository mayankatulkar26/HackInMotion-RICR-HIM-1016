import mongoose, { Schema, model, models, type InferSchemaType } from 'mongoose';

/* -------------------------------------------------------------- User -- */
const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true },
    name: { type: String },
    passwordHash: { type: String },
    image: { type: String },
    isEmailVerified: { type: Boolean, default: false },
    otp: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } },
);
export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };
export const User = (models.User as mongoose.Model<UserDoc>) || model<UserDoc>('User', UserSchema);

/* --------------------------------------------------------- Transaction -- */
const TransactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', default: null },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['debit', 'credit'], required: true, default: 'debit' },
    date: { type: Date, required: true, index: true },
    description: { type: String, required: true, maxlength: 500 },
    merchantName: { type: String },
    category: { type: String, required: true, default: 'Uncategorized', index: true },
    isRecurring: { type: Boolean, default: false },
    dedupeHash: { type: String, required: true, index: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } },
);
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, dedupeHash: 1 });
export type TransactionDoc = InferSchemaType<typeof TransactionSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const Transaction =
  (models.Transaction as mongoose.Model<TransactionDoc>) ||
  model<TransactionDoc>('Transaction', TransactionSchema);

/* -------------------------------------------------------------- Budget -- */
const BudgetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, required: true },
    monthlyLimit: { type: Number, required: true },
    month: { type: String, required: true }, // YYYY-MM
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } },
);
BudgetSchema.index({ userId: 1, category: 1, month: 1 }, { unique: true });
export type BudgetDoc = InferSchemaType<typeof BudgetSchema> & { _id: mongoose.Types.ObjectId };
export const Budget =
  (models.Budget as mongoose.Model<BudgetDoc>) || model<BudgetDoc>('Budget', BudgetSchema);

/* -------------------------------------------------------- SavingsGoal -- */
const SavingsGoalSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, maxlength: 120 },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, required: true, default: 0 },
    deadline: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } },
);
export type SavingsGoalDoc = InferSchemaType<typeof SavingsGoalSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const SavingsGoal =
  (models.SavingsGoal as mongoose.Model<SavingsGoalDoc>) ||
  model<SavingsGoalDoc>('SavingsGoal', SavingsGoalSchema);

/* -------------------------------------------------- FinancialSnapshot -- */
const FinancialSnapshotSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    month: { type: String, required: true },
    healthScore: { type: Number, required: true },
    income: { type: Number, required: true },
    totalExpense: { type: Number, required: true },
    savingsRate: { type: Number, required: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } },
);
export type FinancialSnapshotDoc = InferSchemaType<typeof FinancialSnapshotSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const FinancialSnapshot =
  (models.FinancialSnapshot as mongoose.Model<FinancialSnapshotDoc>) ||
  model<FinancialSnapshotDoc>('FinancialSnapshot', FinancialSnapshotSchema);

/* ------------------------------------------------------- MerchantCache -- */
const MerchantCacheSchema = new Schema(
  {
    merchantKey: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } },
);
export type MerchantCacheDoc = InferSchemaType<typeof MerchantCacheSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const MerchantCache =
  (models.MerchantCache as mongoose.Model<MerchantCacheDoc>) ||
  model<MerchantCacheDoc>('MerchantCache', MerchantCacheSchema);

/**
 * UI-friendly types with `id: string` (Mongoose _id serialized).
 * Server actions convert docs through `toPlain()` in db/serialize.ts
 * before handing them to client components.
 */
export type Transaction = {
  id: string;
  userId: string;
  accountId: string | null;
  amount: number;
  type: 'debit' | 'credit';
  date: Date;
  description: string;
  merchantName: string | null;
  category: string;
  isRecurring: boolean;
  dedupeHash: string;
  createdAt: Date;
};
export type Budget = {
  id: string;
  userId: string;
  category: string;
  monthlyLimit: number;
  month: string;
  createdAt: Date;
};
export type SavingsGoal = {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date | null;
  createdAt: Date;
};
