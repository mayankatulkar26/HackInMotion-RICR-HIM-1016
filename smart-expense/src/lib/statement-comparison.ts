export type StatementTransaction = {
  amount: number;
  type: 'credit' | 'debit';
  description?: string;
};

export type StatementAnalysis = {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number;
  expenseRatio: number;
  score: number;
  financialMix: Array<{ name: string; value: number; color: string }>;
  spendingMix: Array<{ name: string; value: number; color: string }>;
};

export type StatementComparison = {
  left: StatementAnalysis;
  right: StatementAnalysis;
  winner: 'left' | 'right' | 'tie';
  summary: string;
};

const COLORS = ['#7c3aed', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#f97316'];

export function analyzeBankStatement(transactions: StatementTransaction[]): StatementAnalysis {
  const totalIncome = transactions
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
  const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        50 +
          savingsRate * 0.7 -
          expenseRatio * 0.35 +
          (totalExpense > 0 ? 10 : 0) -
          (totalIncome === 0 ? 15 : 0),
      ),
    ),
  );

  const ordered = transactions
    .filter((t) => t.type === 'debit')
    .map((t) => ({
      name: (t.description ?? 'Other spending').trim() || 'Other spending',
      value: Math.abs(t.amount),
    }))
    .reduce<Record<string, number>>((acc, item) => {
      acc[item.name] = (acc[item.name] ?? 0) + item.value;
      return acc;
    }, {});

  const spendingMix = Object.entries(ordered)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length],
    }));

  const financialMix = [
    { name: 'Income', value: totalIncome, color: '#22c55e' },
    { name: 'Expense', value: totalExpense, color: '#ef4444' },
  ];

  if (spendingMix.length === 0) {
    spendingMix.push({ name: 'No debit activity', value: 1, color: '#94a3b8' });
  }

  return {
    totalIncome,
    totalExpense,
    netSavings,
    savingsRate,
    expenseRatio,
    score,
    financialMix,
    spendingMix,
  };
}

export function compareBankStatements(
  left: StatementAnalysis,
  right: StatementAnalysis,
): StatementComparison {
  const leftScore = left.score + (left.netSavings > right.netSavings ? 8 : 0) + (left.expenseRatio < right.expenseRatio ? 6 : 0);
  const rightScore = right.score + (right.netSavings > left.netSavings ? 8 : 0) + (right.expenseRatio < left.expenseRatio ? 6 : 0);

  let winner: StatementComparison['winner'] = 'tie';
  if (leftScore > rightScore) winner = 'left';
  if (rightScore > leftScore) winner = 'right';

  const winnerStatement = winner === 'left' ? 'Statement A' : winner === 'right' ? 'Statement B' : 'Neither statement';
  const summary =
    winner === 'tie'
      ? 'Both bank statements are similarly balanced. Review category mix and cash flow discipline to pick the stronger statement.'
      : `${winnerStatement} looks better overall because it has stronger savings discipline, a healthier net result, and a lower expense burden.`;

  return {
    left,
    right,
    winner,
    summary,
  };
}
