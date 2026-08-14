'use client';

import { useMemo, useState, useTransition } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Search, Trash2 } from 'lucide-react';
import type { Transaction } from '@/db/models';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CATEGORIES, categoryColor } from '@/lib/categories';
import { cn, formatCurrency } from '@/lib/utils';
import { deleteTransaction } from '@/actions/transactions';

export function TransactionTable({ rows }: { rows: Transaction[] }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [month, setMonth] = useState('All');
  const [year, setYear] = useState('All');
  const [pending, startTransition] = useTransition();

  const yearOptions = useMemo(() => {
    const years = [...new Set(rows.map((r) => new Date(r.date).getFullYear()))].sort((a, b) => b - a);
    return years.map((value) => ({ value: String(value), label: String(value) }));
  }, [rows]);

  const monthOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = format(d, 'MMM yyyy');
      if (!map.has(key)) map.set(key, label);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([value, label]) => ({ value, label }));
  }, [rows]);

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim();
    return rows.filter((r) => {
      if (cat !== 'All' && r.category !== cat) return false;
      if (query && !r.description.toLowerCase().includes(query)) return false;

      const d = new Date(r.date);
      const rowYear = String(d.getFullYear());
      const rowMonth = `${rowYear}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      if (year !== 'All' && rowYear !== year) return false;
      if (month !== 'All' && rowMonth !== month) return false;

      return true;
    });
  }, [rows, q, cat, month, year]);

  function onDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteTransaction(id);
        toast.success('Deleted');
      } catch {
        toast.error('Could not delete');
      }
    });
  }

  if (rows.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No transactions yet. Add one on the left, or import a CSV.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search descriptions…"
            className="pl-9"
          />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All years</SelectItem>
            {yearOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All months</SelectItem>
            {monthOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border/70 overflow-hidden">
        <div className="max-h-[540px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 sticky top-0 backdrop-blur">
              <tr>
                <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Date
                </th>
                <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Description
                </th>
                <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Category
                </th>
                <th className="text-right px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Amount
                </th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((r) => {
                const color = categoryColor(r.category);
                const isCredit = r.type === 'credit';
                return (
                  <tr
                    key={r.id}
                    className="group hover:bg-secondary/40 transition-colors"
                  >
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      {format(new Date(r.date), 'd MMM yyyy')}
                    </td>
                    <td className="px-3 py-2 max-w-[280px] truncate">{r.description}</td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs"
                        style={{ background: `${color}18`, color }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: color }}
                        />
                        {r.category}
                      </span>
                    </td>
                    <td
                      className={cn(
                        'px-3 py-2 text-right num font-medium whitespace-nowrap',
                        isCredit ? 'text-success' : 'text-destructive',
                      )}
                    >
                      {isCredit ? '+' : '−'}
                      {formatCurrency(r.amount)}
                    </td>
                    <td className="px-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDelete(r.id)}
                        disabled={pending}
                        aria-label="Delete transaction"
                        title="Delete transaction"
                        className="h-8 w-8 text-muted-foreground/70 opacity-70 hover:opacity-100 hover:text-destructive group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {rows.length}
      </p>
    </div>
  );
}
