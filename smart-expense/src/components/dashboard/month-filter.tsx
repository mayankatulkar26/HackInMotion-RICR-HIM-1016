'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { CalendarDays, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { setDashboardMonth } from '@/actions/dashboard';
import { monthLabel } from '@/lib/dashboard-filter';

interface Props {
  /** Currently applied filter ("YYYY-MM" or null for all-time). */
  current: string | null;
  /** All months the user has data in, newest first (from listAvailableMonths). */
  months: string[];
}

const ALL = '__all__';

export function MonthFilter({ current, months }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(value: string) {
    startTransition(async () => {
      await setDashboardMonth(value === ALL ? null : value);
      router.refresh();
    });
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card/60 px-2 py-1.5 backdrop-blur">
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 text-accent animate-spin shrink-0" />
      ) : (
        <CalendarDays className="h-3.5 w-3.5 text-accent shrink-0" />
      )}
      <Select
        value={current ?? ALL}
        onValueChange={onChange}
        disabled={pending}
      >
        <SelectTrigger className="h-7 min-w-[140px] border-0 bg-transparent px-1 py-0 text-xs font-medium shadow-none focus:ring-0 focus-visible:ring-0">
          <SelectValue placeholder="All time" />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value={ALL}>All time</SelectItem>
          {months.length === 0 && (
            <SelectItem value="__none__" disabled>
              No data yet
            </SelectItem>
          )}
          {months.map((m) => (
            <SelectItem key={m} value={m}>
              {monthLabel(m)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
