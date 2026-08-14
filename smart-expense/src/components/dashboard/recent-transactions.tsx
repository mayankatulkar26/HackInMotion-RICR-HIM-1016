'use client';

import { format } from 'date-fns';
import { motion } from 'framer-motion';
import type { Transaction } from '@/db/models';
import { categoryColor } from '@/lib/categories';
import { cn, formatCurrency } from '@/lib/utils';

export function RecentTransactions({ rows }: { rows: Transaction[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nothing here yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border/50">
      {rows.map((r, i) => {
        const isCredit = r.type === 'credit';
        const color = categoryColor(r.category);
        return (
          <motion.li
            key={r.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.04 }}
            className="flex items-center justify-between gap-3 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="h-9 w-9 shrink-0 rounded-lg grid place-items-center text-xs font-semibold"
                style={{ background: `${color}20`, color }}
              >
                {r.category.slice(0, 2)}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{r.description}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(r.date), 'd MMM yyyy')} · {r.category}
                </p>
              </div>
            </div>
            <p
              className={cn(
                'text-sm font-semibold num shrink-0',
                isCredit ? 'text-success' : 'text-destructive',
              )}
            >
              {isCredit ? '+' : '−'}
              {formatCurrency(r.amount)}
            </p>
          </motion.li>
        );
      })}
    </ul>
  );
}
