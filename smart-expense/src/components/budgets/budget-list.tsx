'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import type { Budget } from '@/db/models';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { categoryColor } from '@/lib/categories';
import { cn, formatCurrency } from '@/lib/utils';
import { deleteBudget } from '@/actions/budgets';

export function BudgetList({
  budgets,
  spentMap,
}: {
  budgets: Budget[];
  spentMap: Record<string, number>;
}) {
  const [pending, startTransition] = useTransition();

  if (budgets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
        No budgets set for this month yet.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {budgets.map((b) => {
        const spent = spentMap[b.category] ?? 0;
        const pct = Math.min(200, (spent / b.monthlyLimit) * 100);
        const state =
          pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';
        const barColor =
          state === 'over'
            ? 'bg-destructive'
            : state === 'warn'
              ? 'bg-warning'
              : 'bg-accent';
        const color = categoryColor(b.category);
        return (
          <li key={b.id} className="rounded-lg border border-border/60 bg-secondary/20 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: color }}
                />
                <p className="font-medium">{b.category}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm num">
                  <span
                    className={cn(
                      state === 'over'
                        ? 'text-destructive font-semibold'
                        : state === 'warn'
                          ? 'text-warning'
                          : 'text-foreground',
                    )}
                  >
                    {formatCurrency(spent)}
                  </span>
                  <span className="text-muted-foreground">
                    {' '}
                    / {formatCurrency(b.monthlyLimit)}
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
                        await deleteBudget(b.id);
                        toast.success('Removed');
                      } catch {
                        toast.error('Could not delete');
                      }
                    })
                  }
                  aria-label={`Delete budget for ${b.category}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <Progress
              value={Math.min(100, pct)}
              indicatorClassName={cn('transition-all', barColor)}
              className="mt-3"
            />
            {state === 'over' && (
              <p className="mt-2 text-xs text-destructive">
                Over budget by {formatCurrency(spent - b.monthlyLimit)}
              </p>
            )}
            {state === 'warn' && (
              <p className="mt-2 text-xs text-warning">
                {Math.round(pct)}% used — approaching your limit
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
