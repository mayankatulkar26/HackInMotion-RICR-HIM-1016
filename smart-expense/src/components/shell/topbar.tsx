'use client';

import { LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOutAction } from '@/actions/auth';

interface Props {
  user: { name?: string | null; email?: string | null };
}

export function Topbar({ user }: Props) {
  const initials = (user.name || user.email || 'U')
    .split(/[\s@]/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/60 bg-background/70 backdrop-blur px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 lg:hidden">
        <Button size="icon" variant="ghost" aria-label="Menu">
          <Menu className="h-5 w-5" />
        </Button>
        <p className="font-semibold">SmartExpense</p>
      </div>

      <div className="hidden lg:block text-sm text-muted-foreground">
        Welcome back{user.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-3 rounded-full border border-border/70 bg-card px-3 py-1.5">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-accent/15 text-accent text-xs font-semibold">
            {initials}
          </div>
          <div className="text-xs">
            <p className="font-medium leading-tight">{user.name ?? 'Account'}</p>
            <p className="text-muted-foreground leading-tight">{user.email}</p>
          </div>
        </div>
        <form action={signOutAction}>
          <Button size="sm" variant="outline" type="submit">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
