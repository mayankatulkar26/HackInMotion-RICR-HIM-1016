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
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: Receipt },
  { href: '/budgets', label: 'Budgets & Goals', icon: Target },
  { href: '/insights', label: 'Insights', icon: Sparkles },
  { href: '/comparison', label: 'Comparison', icon: BarChart3 },
  { href: '/chat', label: 'AI Chat', icon: MessageCircle },
];

interface Props {
  /** Called when the user clicks a nav item (used to close the mobile drawer). */
  onNavigate?: () => void;
  /** Shared layoutId for the active-pill animation — different per surface. */
  layoutId?: string;
}

export function NavList({ onNavigate, layoutId = 'sidebar-active' }: Props) {
  const path = usePathname();

  return (
    <nav className="flex-1 px-3 py-2 space-y-1">
      {NAV.map((item) => {
        const active =
          path === item.href ||
          (item.href !== '/dashboard' && path.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out group',
              active
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70 hover:shadow-sm hover:translate-x-0.5',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg bg-accent/12 border border-accent/25 shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              />
            )}
            <item.icon
              className={cn(
                'h-4 w-4 relative shrink-0 transition-all duration-200',
                active ? 'text-accent' : 'group-hover:text-accent group-hover:scale-110',
              )}
            />
            <span className="relative">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
