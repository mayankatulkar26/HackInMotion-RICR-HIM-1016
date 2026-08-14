'use client';

import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { NavList } from './nav-list';

export function Sidebar() {
  return (
    <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen w-64 shrink-0 flex-col self-start border-r border-border/60 bg-card/40 backdrop-blur">
      <div className="p-5">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm tracking-tight leading-tight">Wealth Sight</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Financial dashboard
            </p>
          </div>
        </Link>
      </div>

      <NavList />

      <div className="m-3 rounded-xl border border-border/70 bg-gradient-to-br from-accent/10 to-transparent p-4">
        <p className="text-xs font-medium text-accent">Pro tip</p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          Upload a CSV of your last 3 months to unlock spending trends and
          personalized recommendations.
        </p>
      </div>
    </aside>
  );
}
