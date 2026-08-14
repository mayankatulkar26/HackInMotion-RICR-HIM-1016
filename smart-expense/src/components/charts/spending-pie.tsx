'use client';

import { motion } from 'framer-motion';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { categoryColor } from '@/lib/categories';
import { formatCurrency } from '@/lib/utils';

interface Props {
  data: Array<{ category: string; amount: number }>;
}

export function SpendingPie({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="grid place-items-center py-14 text-sm text-muted-foreground">
        Add some expenses to see your spending breakdown.
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="h-[260px] sm:h-[320px] w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="category"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={2}
            stroke="hsl(var(--background))"
            strokeWidth={2}
            animationDuration={800}
            animationBegin={100}
          >
            {data.map((d) => (
              <Cell key={d.category} fill={categoryColor(d.category)} />
            ))}
          </Pie>
          <Tooltip
            cursor={{ fill: 'transparent' }}
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
              fontSize: '0.8rem',
            }}
            formatter={(v: number, name) => [
              `${formatCurrency(v)} (${((v / total) * 100).toFixed(0)}%)`,
              name,
            ]}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: '0.75rem', paddingTop: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
