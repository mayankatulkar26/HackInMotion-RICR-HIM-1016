'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Receipt,
  Sparkles,
  Sun,
  Target,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOutAction } from '@/actions/auth';
import { cn, formatCurrency } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: Receipt },
  { href: '/budgets', label: 'Budgets & Goals', icon: Target },
  { href: '/insights', label: 'Insights', icon: Sparkles },
  { href: '/chat', label: 'AI Chat', icon: MessageCircle },
];

interface Props {
  user: { name?: string | null; email?: string | null };
  goals?: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
  }>;
}

export function Topbar({ user, goals = [] }: Props) {
  const path = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const hasShownGoalToast = useRef(false);

  useEffect(() => {
    if (hasShownGoalToast.current || goals.length === 0) return;

    const activeGoals = goals.filter(
      (goal) => goal.targetAmount > 0 && goal.currentAmount < goal.targetAmount,
    );

    if (activeGoals.length === 0) {
      hasShownGoalToast.current = true;
      return;
    }

    hasShownGoalToast.current = true;

    activeGoals.slice(0, 2).forEach((goal) => {
      const pctComplete = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
      const pctLeft = Math.max(0, 100 - pctComplete);
      const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

      toast(`${goal.name} — ${pctLeft.toFixed(0)}% left`, {
        description: `${formatCurrency(remaining)} remaining to complete this goal`,
        duration: 2500,
        action: {
          label: 'View goal',
          onClick: () => router.push('/budgets'),
        },
      });
    });
  }, [goals, router]);

  const initials = (user.name || user.email || 'U')
    .split(/[\s@]/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/60 bg-background/70 backdrop-blur px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 lg:hidden">
          <Button
            size="icon"
            variant="ghost"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">Wealth Sight</p>
          </div>
        </div>

        <div className="flex-1 min-w-0 text-left lg:flex-none lg:text-left">
          <div className="block text-base font-extrabold uppercase tracking-[0.08em] text-foreground/95 sm:text-lg lg:text-xl">
            <span className="text-foreground">Hello</span>
            <span className="ml-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
              {user.name ? `, ${user.name.split(' ')[0].toUpperCase()}` : ''}
            </span>
            <span className="ml-1 align-middle">👋</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Toggle theme"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="h-9 w-9 rounded-full"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <div className="hidden sm:flex items-center gap-3 rounded-full border border-border/70 bg-card px-3 py-1.5">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-accent/15 text-accent text-xs font-semibold">
              {initials}
            </div>
            <div className="text-xs">
              <p className="font-medium leading-tight">{user.name ?? 'Account'}</p>
              <p className="text-muted-foreground leading-tight">{user.email}</p>
            </div>
          </div>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              await signOutAction();
              toast.success('Sign out successfully');
              router.push('/');
            }}
          >
            <Button size="sm" variant="outline" type="submit">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </form>
        </div>
      </header>

      {mobileOpen && (
        <div className="border-b border-border/60 bg-card/95 backdrop-blur lg:hidden">
          <nav className="space-y-1 p-3">
            {NAV.map((item) => {
              const active =
                path === item.href ||
                (item.href !== '/dashboard' && path.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    active
                      ? 'bg-accent/12 text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      active ? 'text-accent' : 'text-muted-foreground',
                    )}
                  />
                  <span>{item.label}</span>
                  {active && (
                    <div className="ml-auto h-2 w-2 rounded-full bg-accent" />
                  )}
                </Link>
              );
            })}

            <div className="mt-3 rounded-xl border border-border/70 bg-gradient-to-br from-accent/10 to-transparent p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-accent">
                <Wallet className="h-3.5 w-3.5" />
                SmartExpense
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Upload a CSV of your last 3 months to unlock spending trends and
                personalized recommendations.
              </p>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
