'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Sliders } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { categoryColor } from '@/lib/categories';

interface Props {
  income: number;
  expense: number;
  topCategories: Array<{ category: string; amount: number }>;
}

export function SavingsSimulator({ income, expense, topCategories }: Props) {
  const [category, setCategory] = useState<string>(
    topCategories[0]?.category ?? 'Food',
  );
  const [cutPct, setCutPct] = useState(30);

  const catAmount =
    topCategories.find((t) => t.category === category)?.amount ?? 0;

  const monthlySaved = (catAmount * cutPct) / 100;
  const newExpense = expense - monthlySaved;
  const currentSaved = Math.max(0, income - expense);
  const newSaved = Math.max(0, income - newExpense);
  const newSavingsRate = income > 0 ? (newSaved / income) * 100 : 0;
  const annualSaved = monthlySaved * 12;

  const color = useMemo(() => categoryColor(category), [category]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-accent">
          <Sliders className="h-4 w-4" />
          <p className="text-xs uppercase tracking-wider font-semibold">
            What-if simulator
          </p>
        </div>
        <CardTitle className="text-lg sm:text-xl">Savings simulator</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Cut a category to see how it affects your monthly savings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-[1fr_auto] gap-2 sm:gap-3 items-end">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Category
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {topCategories.length === 0 ? (
                  <SelectItem value="Food" disabled>
                    No categories yet
                  </SelectItem>
                ) : (
                  topCategories.map((t) => (
                    <SelectItem key={t.category} value={t.category}>
                      {t.category}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Cut by
            </p>
            <p className="text-2xl sm:text-3xl font-semibold num" style={{ color }}>
              {cutPct}%
            </p>
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={cutPct}
          onChange={(e) => setCutPct(Number(e.target.value))}
          className="w-full accent-current"
          style={{ accentColor: color }}
        />

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <motion.div
            key={monthlySaved}
            initial={{ scale: 0.98, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="rounded-lg bg-accent/10 border border-accent/30 p-2 sm:p-4"
          >
            <p className="text-xs uppercase tracking-wider text-accent">
              Monthly savings ↑
            </p>
            <p className="mt-1 text-lg sm:text-2xl font-semibold num break-words">
              {formatCurrency(monthlySaved)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              from {formatCurrency(currentSaved)} → {formatCurrency(newSaved)}
            </p>
          </motion.div>
          <motion.div
            key={annualSaved}
            initial={{ scale: 0.98, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.05 }}
            className="rounded-lg bg-secondary/50 border border-border p-2 sm:p-4"
          >
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Over a year
            </p>
            <p className="mt-1 text-lg sm:text-2xl font-semibold num break-words">
              {formatCurrency(annualSaved)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Savings rate: {newSavingsRate.toFixed(1)}%
            </p>
          </motion.div>
        </div>

        <div className="rounded-lg bg-secondary/30 border border-border/60 p-3 text-xs text-muted-foreground flex gap-2 items-start">
          <Sparkles className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
          <span>
            Based on your last 30 days of {category} spending
            ({formatCurrency(catAmount)}). Assumes the cut is sustained monthly.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
