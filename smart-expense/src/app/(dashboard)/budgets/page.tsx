import { listBudgets, listGoals } from '@/actions/budgets';
import { spendByCategorySince } from '@/actions/analysis';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BudgetForm } from '@/components/budgets/budget-form';
import { GoalForm } from '@/components/budgets/goal-form';
import { BudgetList } from '@/components/budgets/budget-list';
import { GoalList } from '@/components/budgets/goal-list';
import { monthKey } from '@/lib/utils';

export default async function BudgetsPage() {
  const month = monthKey();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [budgets, goals, spentMap] = await Promise.all([
    listBudgets(month),
    listGoals(),
    spendByCategorySince(monthStart),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Guardrails
        </p>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">
          Budgets &amp; Goals
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set monthly limits and track savings targets.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly budgets</CardTitle>
            <CardDescription>Category limits for {month}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <BudgetForm />
            <BudgetList budgets={budgets} spentMap={spentMap} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Savings goals</CardTitle>
            <CardDescription>Track long-term targets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <GoalForm />
            <GoalList goals={goals} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
