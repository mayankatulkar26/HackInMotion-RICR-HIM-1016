'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CATEGORIES } from '@/lib/categories';
import { upsertBudget } from '@/actions/budgets';

const CAT_OPTIONS = CATEGORIES.filter(
  (c) => c !== 'Salary' && c !== 'Investment' && c !== 'Transfer' && c !== 'Uncategorized',
);

export function BudgetForm() {
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState<string>('Food');

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const limit = parseFloat(fd.get('limit') as string);
    if (!limit || limit <= 0) {
      toast.error('Enter a positive limit');
      return;
    }
    startTransition(async () => {
      try {
        await upsertBudget({ category: category as any, monthlyLimit: limit });
        toast.success(`Budget for ${category} saved`);
        (e.target as HTMLFormElement).reset();
      } catch {
        toast.error('Could not save');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
      <div className="space-y-1">
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CAT_OPTIONS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="limit">Monthly limit (₹)</Label>
        <Input id="limit" name="limit" type="number" step="0.01" placeholder="8000" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save
      </Button>
    </form>
  );
}
