'use client';

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { AlarmClock, AlertCircle, CalendarClock, Repeat } from 'lucide-react';
import { categoryColor } from '@/lib/categories';
import { cn, formatCurrency } from '@/lib/utils';
import type { UpcomingBill } from '@/actions/analysis';

interface Props {
  bills: UpcomingBill[];
}

function statusMeta(status: UpcomingBill['status']) {
  switch (status) {
    case 'overdue':
      return {
        icon: AlertCircle,
        label: 'Overdue',
        pill:
          'bg-destructive/15 text-destructive border-destructive/30',
      };
    case 'due-soon':
      return {
        icon: AlarmClock,
        label: 'Due soon',
        pill: 'bg-warning/15 text-warning border-warning/30',
      };
    case 'upcoming':
    default:
      return {
        icon: CalendarClock,
        label: 'Upcoming',
        pill: 'bg-accent/15 text-accent border-accent/30',
      };
  }
}

function dueLabel(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days > 0) return `in ${days} days`;
  if (days === -1) return '1 day overdue';
  return `${Math.abs(days)} days overdue`;
}

export function UpcomingBills({ bills }: Props) {
  const total = bills
    .filter((b) => b.status !== 'overdue')
    .reduce((s, b) => s + b.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card-elev p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-warning">
          <AlarmClock className="h-4 w-4" />
          <p className="text-xs uppercase tracking-wider font-semibold">
            Upcoming Bills
          </p>
        </div>
        {bills.length > 0 && (
          <p className="text-xs text-muted-foreground">
            <span className="num text-foreground font-semibold">
              {formatCurrency(total)}
            </span>{' '}
            due in the next 30 days
          </p>
        )}
      </div>

      <h3 className="mt-1 text-lg font-semibold">
        {bills.length === 0
          ? 'Nothing due soon'
          : `${bills.length} ${bills.length === 1 ? 'bill' : 'bills'} on the horizon`}
      </h3>

      {bills.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Predicted from recurring charges we&apos;ve seen at least 3 times.
          Add a few months of statements and monthly/quarterly/annual bills
          will show up here.
        </p>
      ) : (
        <ul className="mt-4 space-y-2 max-h-72 overflow-auto pr-1">
          {bills.slice(0, 8).map((b) => {
            const color = categoryColor(b.category);
            const meta = statusMeta(b.status);
            const Icon = meta.icon;
            return (
              <li
                key={`${b.merchant}-${b.amount}-${b.nextExpected.toISOString()}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-secondary/20 p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="h-8 w-8 shrink-0 rounded-lg grid place-items-center"
                    style={{ background: `${color}20`, color }}
                    title={b.category}
                  >
                    <Repeat className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{b.merchant}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {b.category} · every ~{b.medianGapDays} days ·{' '}
                      expected {format(b.nextExpected, 'd MMM')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                      meta.pill,
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {dueLabel(b.daysUntilDue)}
                  </span>
                  <p className="text-sm font-semibold num shrink-0">
                    {formatCurrency(b.amount)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}
