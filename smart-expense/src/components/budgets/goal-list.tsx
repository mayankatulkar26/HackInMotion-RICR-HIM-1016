'use client';

import { format } from 'date-fns';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Edit3, Save, Trash2, Target, X } from 'lucide-react';
import type { SavingsGoal } from '@/db/models';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { deleteGoal, upsertGoal } from '@/actions/budgets';

export function GoalList({ goals }: { goals: SavingsGoal[] }) {
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
  });

  function beginEdit(goal: SavingsGoal) {
    setEditingId(goal.id);
    setDraft({
      name: goal.name,
      targetAmount: String(goal.targetAmount),
      currentAmount: String(goal.currentAmount),
      deadline: goal.deadline ? format(new Date(goal.deadline), 'yyyy-MM-dd') : '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({ name: '', targetAmount: '', currentAmount: '', deadline: '' });
  }

  function saveEdit(goalId: string) {
    const name = draft.name.trim();
    const target = Number(draft.targetAmount);
    const current = Number(draft.currentAmount || '0');

    if (!name || !Number.isFinite(target) || target <= 0) {
      toast.error('Goal name and target amount are required');
      return;
    }

    if (!Number.isFinite(current) || current < 0) {
      toast.error('Current amount must be zero or more');
      return;
    }

    startTransition(async () => {
      try {
        await upsertGoal({
          id: goalId,
          name,
          targetAmount: target,
          currentAmount: current,
          deadline: draft.deadline || undefined,
        });
        toast.success('Goal updated');
        cancelEdit();
      } catch {
        toast.error('Could not update goal');
      }
    });
  }

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
        const isEditing = editingId === g.id;

        return (
          <li key={g.id} className="rounded-lg border border-border/60 bg-secondary/20 p-4">
            {isEditing ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor={`goal-name-${g.id}`}>Goal name</Label>
                    <Input
                      id={`goal-name-${g.id}`}
                      value={draft.name}
                      onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`goal-target-${g.id}`}>Target (₹)</Label>
                    <Input
                      id={`goal-target-${g.id}`}
                      type="number"
                      step="0.01"
                      value={draft.targetAmount}
                      onChange={(e) => setDraft((prev) => ({ ...prev, targetAmount: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`goal-current-${g.id}`}>Current (₹)</Label>
                    <Input
                      id={`goal-current-${g.id}`}
                      type="number"
                      step="0.01"
                      value={draft.currentAmount}
                      onChange={(e) => setDraft((prev) => ({ ...prev, currentAmount: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor={`goal-deadline-${g.id}`}>Deadline</Label>
                    <Input
                      id={`goal-deadline-${g.id}`}
                      type="date"
                      value={draft.deadline}
                      onChange={(e) => setDraft((prev) => ({ ...prev, deadline: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={cancelEdit} disabled={pending}>
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                  <Button type="button" size="sm" onClick={() => saveEdit(g.id)} disabled={pending}>
                    <Save className="h-3.5 w-3.5" />
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <>
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
                      className="h-7 w-7"
                      disabled={pending}
                      onClick={() => beginEdit(g)}
                      aria-label={`Edit goal ${g.name}`}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
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
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
