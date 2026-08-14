'use client';

import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCompactCurrency, formatCurrency } from '@/lib/utils';

interface Props {
  data: Array<{ month: string; income: number; expense: number }>;
}

function shortMonth(ym: string): string {
  // "2026-08" → "Aug"
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short' });
}

export function MonthlyTrend({ data }: Props) {
  const hasSignal = data.some((d) => d.income > 0 || d.expense > 0);
  if (!hasSignal) {
    return (
      <div className="grid place-items-center py-14 text-sm text-muted-foreground">
        Not enough history yet. Add more transactions to see a trend.
      </div>
    );
  }

  const display = data.map((d) => ({ ...d, label: shortMonth(d.month) }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-[240px] sm:h-[320px] w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={display} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="income-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expense-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => formatCompactCurrency(v)}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
              fontSize: '0.8rem',
            }}
            formatter={(v: number, name) => [formatCurrency(v), name]}
          />
          <Area
            type="monotone"
            dataKey="income"
            stroke="hsl(var(--accent))"
            strokeWidth={2}
            fill="url(#income-grad)"
            animationDuration={900}
          />
          <Area
            type="monotone"
            dataKey="expense"
            stroke="hsl(var(--destructive))"
            strokeWidth={2}
            fill="url(#expense-grad)"
            animationDuration={900}
            animationBegin={150}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
