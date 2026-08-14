'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Receipt,
  Target,
  Sparkles,
  MessageCircle,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: Receipt },
  { href: '/budgets', label: 'Budgets & Goals', icon: Target },
  { href: '/insights', label: 'Insights', icon: Sparkles },
  { href: '/chat', label: 'AI Chat', icon: MessageCircle },
];

export function Sidebar() {
  const path = usePathname();

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border/60 bg-card/40 backdrop-blur">
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

      <nav className="flex-1 px-3 py-2 space-y-1">
        {NAV.map((item) => {
          const active =
            path === item.href ||
            (item.href !== '/dashboard' && path.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all group',
                active
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-accent/12 border border-accent/25"
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                />
              )}
              <item.icon
                className={cn(
                  'h-4 w-4 relative shrink-0 transition-colors',
                  active ? 'text-accent' : 'group-hover:text-accent',
                )}
              />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>

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
