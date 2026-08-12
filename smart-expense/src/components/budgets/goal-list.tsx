'use client';

import { format } from 'date-fns';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Trash2, Target } from 'lucide-react';
import type { SavingsGoal } from '@/db/models';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { deleteGoal } from '@/actions/budgets';

export function GoalList({ goals }: { goals: SavingsGoal[] }) {
  const [pending, startTransition] = useTransition();

  if (goals.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
        No savings goals yet. Add one to track your progress.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {goals.map((g) => {
        const pct = Math.min(100, (g.currentAmount / g.targetAmount) * 100);
        return (
          <li key={g.id} className="rounded-lg border border-border/60 bg-secondary/20 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent">
                  <Target className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-medium">{g.name}</p>
                  {g.deadline && (
                    <p className="text-xs text-muted-foreground">
                      by {format(new Date(g.deadline), 'd MMM yyyy')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm num">
                  <span className="text-accent font-semibold">
                    {formatCurrency(g.currentAmount)}
                  </span>
                  <span className="text-muted-foreground">
                    {' '}
                    / {formatCurrency(g.targetAmount)}
                  </span>
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 hover:text-destructive"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await deleteGoal(g.id);
                        toast.success('Removed');
                      } catch {
                        toast.error('Could not delete');
                      }
                    })
                  }
                  aria-label={`Delete goal ${g.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <Progress value={pct} className="mt-3" />
            <p className="mt-2 text-xs text-muted-foreground">
              {Math.round(pct)}% complete
            </p>
          </li>
        );
      })}
    </ul>
  );
}
