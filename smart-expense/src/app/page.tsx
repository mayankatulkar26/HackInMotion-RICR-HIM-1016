'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { ArrowRight, Moon, Sparkles, ShieldCheck, Sun, TrendingUp, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LandingHero } from '@/components/marketing/landing-hero';
import { FeatureGrid } from '@/components/marketing/feature-grid';

export default function LandingPage() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <main className="min-h-dvh bg-background text-foreground relative overflow-hidden">
      <div className="aurora" aria-hidden />
      <div className="absolute inset-0 grid-bg opacity-40" aria-hidden />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent">
            <Wallet className="h-4 w-4" />
          </div>
          <span className="text-lg tracking-tight">Wealth Sight</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="h-9 w-9 rounded-full"
          >
            {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-12 pb-24">
        <LandingHero />
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <FeatureGrid />
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-32">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Sparkles, label: 'Auto-categorized', value: 'in seconds' },
            { icon: TrendingUp, label: 'Health score', value: '0 → 100' },
            { icon: ShieldCheck, label: 'Data stays', value: 'yours' },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="card-elev p-6 flex items-center gap-4 hover:shadow-soft-lg transition-shadow"
            >
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-accent/10 text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {label}
                </p>
                <p className="text-lg font-semibold">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 mx-auto max-w-7xl px-6 py-8 text-center text-xs text-muted-foreground">
        Built for Hack In Motion · FinTech &amp; Personal Finance
      </footer>
    </main>
  );
}
