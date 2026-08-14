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
            onClick={() => setMobileOpen((v) => !v)}
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

        <div className="flex items-center gap-2 sm:gap-3">
          <label className="theme-switch" aria-label="Toggle theme">
            <input
              type="checkbox"
              className="theme-switch__checkbox"
              checked={resolvedTheme === 'dark'}
              onChange={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            />
            <div className="theme-switch__container">
              <div className="theme-switch__clouds" />
              <div className="theme-switch__stars-container">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 55" fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M135.831 3.00688C135.055 3.85027 134.111 4.29946 133 4.35447C134.111 4.40947 135.055 4.85867 135.831 5.71123C136.607 6.55462 136.996 7.56303 136.996 8.72727C136.996 7.95722 137.172 7.25134 137.525 6.59129C137.886 5.93124 138.372 5.39954 138.98 5.00535C139.598 4.60199 140.268 4.39114 141 4.35447C139.88 4.2903 138.936 3.85027 138.16 3.00688C137.384 2.16348 136.996 1.16425 136.996 0C136.996 1.16425 136.607 2.16348 135.831 3.00688ZM31 23.3545C32.1114 23.2995 33.0551 22.8503 33.8313 22.0069C34.6075 21.1635 34.9956 20.1642 34.9956 19C34.9956 20.1642 35.3837 21.1635 36.1599 22.0069C36.9361 22.8503 37.8798 23.2903 39 23.3545C38.2679 23.3911 37.5976 23.602 36.9802 24.0053C36.3716 24.3995 35.8864 24.9312 35.5248 25.5913C35.172 26.2513 34.9956 26.9572 34.9956 27.7273C34.9956 26.563 34.6075 25.5546 33.8313 24.7112C33.0551 23.8587 32.1114 23.4095 31 23.3545ZM0 36.3545C1.11136 36.2995 2.05513 35.8503 2.83131 35.0069C3.6075 34.1635 3.99559 33.1642 3.99559 32C3.99559 33.1642 4.38368 34.1635 5.15987 35.0069C5.93605 35.8503 6.87982 36.2903 8 36.3545C7.26792 36.3911 6.59757 36.602 5.98015 37.0053C5.37155 37.3995 4.88644 37.9312 4.52481 38.5913C4.172 39.2513 3.99559 39.9572 3.99559 40.7273C3.99559 39.563 3.6075 38.5546 2.83131 37.7112C2.05513 36.8587 1.11136 36.4095 0 36.3545ZM56.8313 24.0069C56.0551 24.8503 55.1114 25.2995 54 25.3545C55.1114 25.4095 56.0551 25.8587 56.8313 26.7112C57.6075 27.5546 57.9956 28.563 57.9956 29.7273C57.9956 28.9572 58.172 28.2513 58.5248 27.5913C58.8864 26.9312 59.3716 26.3995 59.9802 26.0053C60.5976 25.602 61.2679 25.3911 62 25.3545C60.8798 25.2903 59.9361 24.8503 59.1599 24.0069C58.3837 23.1635 57.9956 22.1642 57.9956 21C57.9956 22.1642 57.6075 23.1635 56.8313 24.0069ZM81 25.3545C82.1114 25.2995 83.0551 24.8503 83.8313 24.0069C84.6075 23.1635 84.9956 22.1642 84.9956 21C84.9956 22.1642 85.3837 23.1635 86.1599 24.0069C86.9361 24.8503 87.8798 25.2903 89 25.3545C88.2679 25.3911 87.5976 25.602 86.9802 26.0053C86.3716 26.3995 85.8864 26.9312 85.5248 27.5913C85.172 28.2513 84.9956 28.9572 84.9956 29.7273C84.9956 28.563 84.6075 27.5546 83.8313 26.7112C83.0551 25.8587 82.1114 25.4095 81 25.3545ZM136 36.3545C137.111 36.2995 138.055 35.8503 138.831 35.0069C139.607 34.1635 139.996 33.1642 139.996 32C139.996 33.1642 140.384 34.1635 141.16 35.0069C141.936 35.8503 142.88 36.2903 144 36.3545C143.268 36.3911 142.598 36.602 141.98 37.0053C141.372 37.3995 140.886 37.9312 140.525 38.5913C140.172 39.2513 139.996 39.9572 139.996 40.7273C139.996 39.563 139.607 38.5546 138.831 37.7112C138.055 36.8587 137.111 36.4095 136 36.3545ZM101.831 49.0069C101.055 49.8503 100.111 50.2995 99 50.3545C100.111 50.4095 101.055 50.8587 101.831 51.7112C102.607 52.5546 102.996 53.563 102.996 54.7273C102.996 53.9572 103.172 53.2513 103.525 52.5913C103.886 51.9312 104.372 51.3995 104.98 51.0053C105.598 50.602 106.268 50.3911 107 50.3545C105.88 50.2903 104.936 49.8503 104.16 49.0069C103.384 48.1635 102.996 47.1642 102.996 46C102.996 47.1642 102.607 48.1635 101.831 49.0069Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div className="theme-switch__circle-container">
                <div className="theme-switch__sun-moon-container">
                  <div className="theme-switch__moon">
                    <div className="theme-switch__spot" />
                    <div className="theme-switch__spot" />
                    <div className="theme-switch__spot" />
                  </div>
                </div>
              </div>
            </div>
          </label>

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
                Wealth Sight
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
