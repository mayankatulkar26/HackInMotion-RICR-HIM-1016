'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { cn } from '@/lib/utils';

export type ConfirmOptions = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red styling + warning icon. */
  destructive?: boolean;
  /** If set, user must type this exact string before Confirm enables. */
  requireTyping?: string;
};

type Resolver = (ok: boolean) => void;

const ConfirmCtx = createContext<
  ((opts: ConfirmOptions) => Promise<boolean>) | null
>(null);

/**
 * Centered, themed replacement for `window.confirm` / `prompt`.
 * Use via `const confirm = useConfirm();` inside client components.
 */
export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) {
    throw new Error('useConfirm must be used inside <ConfirmProvider>');
  }
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [typed, setTyped] = useState('');
  const resolverRef = useRef<Resolver | null>(null);

  const ask = useCallback((o: ConfirmOptions): Promise<boolean> => {
    setOpts(o);
    setTyped('');
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  function finish(ok: boolean) {
    resolverRef.current?.(ok);
    resolverRef.current = null;
    setOpts(null);
    setTyped('');
  }

  const typingOk =
    !opts?.requireTyping || typed === opts.requireTyping;

  return (
    <ConfirmCtx.Provider value={ask}>
      {children}

      <Dialog.Root
        open={!!opts}
        onOpenChange={(open) => {
          if (!open) finish(false);
        }}
      >
        <AnimatePresence>
          {opts && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm"
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  className={cn(
                    'fixed left-1/2 top-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2',
                    'rounded-xl border bg-card p-4 shadow-soft-lg focus:outline-none',
                    opts.destructive
                      ? 'border-destructive/40'
                      : 'border-border',
                  )}
                >
                  <div className="flex items-start gap-3">
                    {opts.destructive && (
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-destructive/15 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <Dialog.Title className="text-base font-semibold leading-snug break-words">
                        {opts.title}
                      </Dialog.Title>
                      {opts.description && (
                        <Dialog.Description
                          className="mt-2 text-xs text-muted-foreground leading-relaxed break-words"
                          asChild
                        >
                          <div>{opts.description}</div>
                        </Dialog.Description>
                      )}
                    </div>
                  </div>

                  {opts.requireTyping && (
                    <div className="mt-4 space-y-1.5">
                      <Label htmlFor="confirm-typed" className="text-[11px] text-muted-foreground">
                        Type{' '}
                        <span className="font-mono text-destructive">
                          {opts.requireTyping}
                        </span>{' '}
                        to confirm
                      </Label>
                      <Input
                        id="confirm-typed"
                        autoComplete="off"
                        autoFocus
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && typingOk) finish(true);
                        }}
                        placeholder={opts.requireTyping}
                        className={cn(
                          'h-9 text-sm',
                          typed && !typingOk && 'border-destructive/60',
                        )}
                      />
                    </div>
                  )}

                  <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => finish(false)}
                      className="sm:w-auto"
                    >
                      {opts.cancelLabel ?? 'Cancel'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => finish(true)}
                      disabled={!typingOk}
                      className={cn(
                        'min-w-[8rem]',
                        opts.destructive &&
                          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                      )}
                    >
                      {opts.confirmLabel ?? 'Confirm'}
                    </Button>
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </ConfirmCtx.Provider>
  );
}

/** Small inline loader used by callers while their async confirm-callback runs. */
export function ConfirmingSpinner() {
  return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
}
