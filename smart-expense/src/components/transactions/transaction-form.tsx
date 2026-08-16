'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2, PlusCircle } from 'lucide-react';
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
import { addTransaction } from '@/actions/transactions';

export function TransactionForm() {
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<'debit' | 'credit'>('debit');
  const [category, setCategory] = useState<string>('');

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amount = parseFloat(fd.get('amount') as string);
    const description = (fd.get('description') as string).trim();
    const date = fd.get('date') as string;

    if (!amount || amount <= 0) {
      toast.error('Enter a positive amount');
      return;
    }
    if (!description) {
      toast.error('Description is required');
      return;
    }

    startTransition(async () => {
      try {
        await addTransaction({
          amount,
          description,
          date,
          type,
          category: category ? (category as any) : undefined,
        });
        toast.success('Transaction added');
        (e.target as HTMLFormElement).reset();
        setCategory('');
      } catch (_err) {
        toast.error('Could not save. Try again.');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 sm:space-y-4 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="amount" className="text-xs sm:text-sm">Amount (₹)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="500"
            className="text-xs sm:text-sm"
            required
          />
        </div>
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="date" className="text-xs sm:text-sm">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="text-xs sm:text-sm"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="description" className="text-xs sm:text-sm">Description</Label>
        <Input
          id="description"
          name="description"
          placeholder="e.g. Swiggy - Dinner"
          className="text-xs sm:text-sm"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        <div className="space-y-1.5 sm:space-y-2">
          <Label className="text-xs sm:text-sm">Payment type</Label>
          <Select value={type} onValueChange={(v) => setType(v as any)}>
            <SelectTrigger className="text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="debit">Debit</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:space-y-2">
          <Label className="text-xs sm:text-sm">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="text-xs sm:text-sm">
              <SelectValue placeholder="Auto-detect" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.filter((c) => c !== 'Uncategorized').map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" className="w-full text-xs sm:text-sm" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> Adding…
          </>
        ) : (
          <>
            <PlusCircle className="h-3 w-3 sm:h-4 sm:w-4" /> Add transaction
          </>
        )}
      </Button>
    </form>
  );
}
