'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { HealthGauge } from '@/components/charts/health-gauge';

export function LandingHero() {
  return (
    <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
        >
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          AI-powered, made for how you actually spend.
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl"
        >
          Your money,{' '}
          <span className="bg-gradient-to-br from-accent via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            explained.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-5 max-w-xl text-lg text-muted-foreground"
        >
          Upload a bank statement. Wealth Sight auto-categorizes every transaction,
          scores your financial health, and tells you what to fix — in plain English.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-8 flex flex-wrap items-center gap-3"
        >
          <Link
            href="/signup"
            className={`${buttonVariants({ size: 'xl' })} group relative overflow-hidden border border-accent bg-accent text-accent-foreground transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-glow active:scale-[0.98]`}
          >
            <span className="absolute inset-0 origin-left scale-x-0 bg-emerald-500 transition-transform duration-300 ease-out group-hover:scale-x-100" />
            <span className="relative z-10 flex items-center gap-2 group-hover:[animation:button-shake_0.35s_ease-in-out_1]">
              Start free <ArrowRight className="h-5 w-5" />
            </span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-10 grid grid-cols-3 gap-6 max-w-md"
        >
          {[
            { k: '10+', v: 'auto-categories' },
            { k: '0-100', v: 'health score' },
            { k: '<2s', v: 'CSV to insights' },
          ].map((s) => (
            <div key={s.v}>
              <div className="text-2xl font-semibold num">{s.k}</div>
              <div className="text-xs text-muted-foreground">{s.v}</div>
            </div>
          ))}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="relative"
      >
        <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-accent/20 via-transparent to-blue-500/10 blur-3xl" />
        <div className="card-elev p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Financial Health
              </p>
              <p className="text-sm text-muted-foreground/80">This month</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Trending up
            </span>
          </div>
          <div className="mt-4 grid place-items-center">
            <HealthGauge value={78} size={220} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              { l: 'Income', v: '₹65,000', c: 'text-success' },
              { l: 'Expenses', v: '₹42,180', c: 'text-foreground' },
              { l: 'Saved', v: '₹22,820', c: 'text-accent' },
            ].map((x) => (
              <div key={x.l} className="rounded-lg bg-secondary/50 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {x.l}
                </p>
                <p className={`text-sm font-semibold num ${x.c}`}>{x.v}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
