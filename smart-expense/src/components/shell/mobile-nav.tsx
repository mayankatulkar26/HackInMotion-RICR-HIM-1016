'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Wallet, X } from 'lucide-react';
import { NavList } from './nav-list';

/**
 * Mobile navigation — a slide-in drawer triggered from the topbar Menu button.
 * Below `lg` (1024px) the sidebar is hidden; this drawer replaces it.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  // Auto-close whenever the route changes (defensive — NavList also calls onNavigate).
  useEffect(() => {
    setOpen(false);
  }, [path]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-secondary/60 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </Dialog.Trigger>

      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                className="fixed left-0 top-0 z-50 flex h-dvh w-72 flex-col border-r border-border bg-card shadow-soft-lg focus:outline-none"
              >
                <Dialog.Title className="sr-only">Navigation menu</Dialog.Title>
                <Dialog.Description className="sr-only">
                  Move between pages of the SmartExpense dashboard.
                </Dialog.Description>

                <div className="flex items-center justify-between p-5 border-b border-border/60">
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 font-semibold"
                  >
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm tracking-tight leading-tight">
                        SmartExpense
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Financial dashboard
                      </p>
                    </div>
                  </Link>
                  <Dialog.Close asChild>
                    <button
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                      aria-label="Close menu"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Dialog.Close>
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                  <NavList
                    onNavigate={() => setOpen(false)}
                    layoutId="mobile-nav-active"
                  />
                </div>

                <div className="m-3 rounded-xl border border-border/70 bg-gradient-to-br from-accent/10 to-transparent p-4">
                  <p className="text-xs font-medium text-accent">Pro tip</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Upload a CSV of your last 3 months to unlock spending trends and
                    personalized recommendations.
                  </p>
                </div>
              </motion.aside>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
