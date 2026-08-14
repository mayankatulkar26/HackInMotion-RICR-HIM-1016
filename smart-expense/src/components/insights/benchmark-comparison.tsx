'use client';

import { useMemo, useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { Users, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  INCOME_BRACKETS,
  type IncomeBracket,
} from '@/lib/benchmarks';
import { categoryColor } from '@/lib/categories';
import { formatCurrency } from '@/lib/utils';
import type { BenchmarkResult } from '@/actions/analysis';
import { getBenchmarkComparison } from '@/actions/analysis';

interface Props {
  initial: BenchmarkResult;
}

/**
 * Anonymised peer-comparison card.
 *
 * The dropdown lets the user override the auto-detected bracket. When
 * changed, we re-fetch the comparison as a server-action call so the
 * numbers reflect the picked bracket without a full page reload.
 */
export function BenchmarkComparison({ initial }: Props) {
  const [result, setResult] = useState<BenchmarkResult>(initial);
  const [pending, startTransition] = useTransition();

  function pickBracket(next: IncomeBracket) {
    if (next === result.bracket) return;
    startTransition(async () => {
      const fresh = await getBenchmarkComparison(next);
      setResult(fresh);
    });
  }

  const chartData = useMemo(
    () =>
      result.rows.map((r) => ({
        category: r.category,
        You: r.userPct,
        Peers: r.peerPct,
        color: categoryColor(r.category),
      })),
    [result.rows],
  );

  const summary = useMemo(() => {
    const above = result.rows.filter((r) => r.verdict === 'above');
    const below = result.rows.filter((r) => r.verdict === 'below');
    return { above, below };
  }, [result.rows]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-accent">
            <Users className="h-4 w-4" />
            <p className="text-xs uppercase tracking-wider font-semibold">
              Peer benchmark
            </p>
          </div>
          <CardTitle>How you compare</CardTitle>
          <CardDescription>
            Your spending share vs {result.bracketLabel.toLowerCase()} bracket.
            {result.detectedFromData && ' (Bracket picked from your detected monthly income.)'}
          </CardDescription>
        </div>
        <div className="w-full sm:w-52">
          <Select value={result.bracket} onValueChange={(v) => pickBracket(v as IncomeBracket)}>
            <SelectTrigger disabled={pending}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INCOME_BRACKETS.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-secondary/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Your monthly income
            </p>
            <p className="text-lg font-semibold num">
              {result.userMonthlyIncome > 0
                ? formatCurrency(result.userMonthlyIncome)
                : '— not detected'}
            </p>
          </div>
          <div className="rounded-lg bg-secondary/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Your monthly expense
            </p>
            <p className="text-lg font-semibold num">
              {formatCurrency(result.userMonthlyExpense)}
            </p>
          </div>
        </div>

        <motion.div
          key={result.bracket}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="h-[320px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -5, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.35)" />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
                width={40}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--secondary) / 0.4)' }}
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  fontSize: '0.8rem',
                }}
                formatter={(v: number, name) => [`${v}%`, name]}
              />
              <Legend
                wrapperStyle={{ fontSize: '0.75rem', paddingTop: 8 }}
                iconType="circle"
              />
              <Bar dataKey="You" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]}>
                {chartData.map((d) => (
                  <Cell key={d.category} fill="hsl(var(--accent))" />
                ))}
              </Bar>
              <Bar dataKey="Peers" fill="hsl(var(--muted-foreground) / 0.6)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Summary callouts */}
        {(summary.above.length > 0 || summary.below.length > 0) && (
          <div className="grid gap-2 sm:grid-cols-2">
            {summary.above.length > 0 && (
              <div className="rounded-lg border border-warning/25 bg-warning/5 p-3">
                <div className="flex items-center gap-2 text-warning text-xs font-semibold">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Above peers
                </div>
                <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                  {summary.above.slice(0, 4).map((r) => (
                    <li key={r.category}>
                      <span className="text-foreground">{r.category}</span> —
                      you {r.userPct}% vs peers {r.peerPct}% (+{r.delta}pp)
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {summary.below.length > 0 && (
              <div className="rounded-lg border border-accent/25 bg-accent/5 p-3">
                <div className="flex items-center gap-2 text-accent text-xs font-semibold">
                  <TrendingDown className="h-3.5 w-3.5" />
                  Below peers
                </div>
                <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                  {summary.below.slice(0, 4).map((r) => (
                    <li key={r.category}>
                      <span className="text-foreground">{r.category}</span> —
                      you {r.userPct}% vs peers {r.peerPct}% ({r.delta}pp)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {summary.above.length === 0 && summary.below.length === 0 && (
          <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 text-xs text-muted-foreground flex items-start gap-2">
            <Minus className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>You&apos;re on par with the {result.bracketLabel.toLowerCase()} bracket across every category.</span>
          </div>
        )}

        <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          <p>{result.disclaimer}</p>
        </div>
      </CardContent>
    </Card>
  );
}
