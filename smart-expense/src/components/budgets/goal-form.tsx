'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { upsertGoal } from '@/actions/budgets';

export function GoalForm() {
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string).trim();
    const target = parseFloat(fd.get('target') as string);
    const current = parseFloat((fd.get('current') as string) || '0');
    const deadline = fd.get('deadline') as string;

    if (!name || !target) {
      toast.error('Name and target amount are required');
      return;
    }

    startTransition(async () => {
      try {
        await upsertGoal({
          name,
          targetAmount: target,
          currentAmount: isNaN(current) ? 0 : current,
          deadline: deadline || undefined,
        });
        toast.success(`Goal "${name}" saved`);
        (e.target as HTMLFormElement).reset();
      } catch {
        toast.error('Could not save');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2">
          <Label htmlFor="name">Goal name</Label>
          <Input id="name" name="name" placeholder="Emergency fund" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="target">Target (₹)</Label>
          <Input id="target" name="target" type="number" step="0.01" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="current">Current (₹)</Label>
          <Input id="current" name="current" type="number" step="0.01" defaultValue={0} />
        </div>
        <div className="space-y-1 col-span-2">
          <Label htmlFor="deadline">Deadline (optional)</Label>
          <Input id="deadline" name="deadline" type="date" />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add goal
      </Button>
    </form>
  );
}
