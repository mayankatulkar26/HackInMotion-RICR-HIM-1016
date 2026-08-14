'use client';

import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, AlertTriangle, Repeat } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { categoryColor } from '@/lib/categories';

interface Props {
  recommendations: string[];
  spikes: Array<{ category: string; current: number; average: number; ratio: number }>;
  subscriptions: Array<{
    merchant: string;
    category: string;
    monthlyEstimate: number;
    stale: boolean;
    count: number;
  }>;
}

export function InsightCards({ recommendations, spikes, subscriptions }: Props) {
  const totalSubs = subscriptions.reduce((s, x) => s + x.monthlyEstimate, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* AI recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card-elev p-6 lg:col-span-2 relative overflow-hidden"
      >
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-accent/10 blur-3xl" aria-hidden />
        <div className="relative">
          <div className="flex items-center gap-2 text-accent">
            <Sparkles className="h-4 w-4" />
            <p className="text-xs uppercase tracking-wider font-semibold">
              AI Recommendations
            </p>
          </div>
          <h3 className="mt-1 text-lg font-semibold">
            Personalized for your spending
          </h3>
          {recommendations.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              AI recommendations appear here once you have a few weeks of data
              and a Gemini API key is set. Everything else on the dashboard is
              already live.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recommendations.slice(0, 5).map((rec, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 * i, duration: 0.3 }}
                  className="flex items-start gap-3 text-sm"
                >
                  <span className="mt-1 grid h-5 w-5 place-items-center rounded-full bg-accent/15 text-accent text-[10px] font-semibold shrink-0 num">
                    {i + 1}
                  </span>
                  <span className="text-foreground/90 leading-relaxed">{rec}</span>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>

      {/* Subscriptions rollup */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="card-elev p-6"
      >
        <div className="flex items-center gap-2 text-cyan-400">
          <Repeat className="h-4 w-4" />
          <p className="text-xs uppercase tracking-wider font-semibold">
            Subscriptions
          </p>
        </div>
        <h3 className="mt-1 text-lg font-semibold">
          {subscriptions.length === 0
            ? 'None detected'
            : `${subscriptions.length} active`}
        </h3>
        {subscriptions.length > 0 && (
          <>
            <p className="mt-1 text-2xl font-semibold num">
              {formatCurrency(totalSubs)}
              <span className="text-xs text-muted-foreground font-normal ml-1">
                /month
              </span>
            </p>
            <ul className="mt-4 space-y-2 max-h-56 overflow-auto">
              {subscriptions.slice(0, 6).map((s) => (
                <li
                  key={s.merchant + s.monthlyEstimate}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="flex items-center gap-2 truncate">
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ background: categoryColor(s.category) }}
                    />
                    <span className="truncate">{s.merchant}</span>
                    {s.stale && (
                      <span className="text-warning text-[10px] shrink-0">
                        · stale
                      </span>
                    )}
                  </span>
                  <span className="num shrink-0">{formatCurrency(s.monthlyEstimate)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {subscriptions.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Recurring merchants show up here once we spot ≥3 hits at similar
            amounts across months.
          </p>
        )}
      </motion.div>

      {/* Spending spikes — full width if any exist */}
      {spikes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="card-elev p-6 lg:col-span-3"
        >
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-xs uppercase tracking-wider font-semibold">
              Spending Spikes
            </p>
          </div>
          <h3 className="mt-1 text-lg font-semibold">
            {spikes.length} {spikes.length === 1 ? 'category is' : 'categories are'} above your 3-month average
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {spikes.slice(0, 6).map((s) => (
              <div
                key={s.category}
                className="rounded-lg border border-warning/30 bg-warning/5 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{s.category}</span>
                  <span className="inline-flex items-center gap-1 text-warning text-xs font-semibold">
                    <TrendingUp className="h-3 w-3" />
                    {Math.round((s.ratio - 1) * 100)}%
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  This month{' '}
                  <span className="text-foreground font-medium num">
                    {formatCurrency(s.current)}
                  </span>
                  {' · avg '}
                  <span className="num">{formatCurrency(s.average)}</span>
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
