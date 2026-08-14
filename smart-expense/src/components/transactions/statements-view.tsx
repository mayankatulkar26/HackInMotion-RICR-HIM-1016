'use client';

import { useMemo, useState, useTransition } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  FileSpreadsheet,
  FileText,
  FileType,
  Layers,
  Loader2,
  PenLine,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TransactionTable } from '@/components/transactions/transaction-table';
import type { ImportBatch, Transaction } from '@/db/models';
import { cn } from '@/lib/utils';
import {
  deleteAllTransactions,
  deleteBatch,
  deleteManualTransactions,
  recategorizeAllTransactions,
} from '@/actions/transactions';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface Props {
  batches: ImportBatch[];
  manualCount: number;
  all: Transaction[];
}

type TabKey = 'all' | 'manual' | string;

const SOURCE_ICON = {
  csv: FileText,
  excel: FileSpreadsheet,
  pdf: FileType,
  manual: PenLine,
} as const;

export function StatementsView({ batches, manualCount, all }: Props) {
  const [active, setActive] = useState<TabKey>('all');
  const [pending, startTransition] = useTransition();
  const [recatPending, startRecatTransition] = useTransition();
  const confirm = useConfirm();

  const activeRows = useMemo(() => {
    if (active === 'all') return all;
    if (active === 'manual') return all.filter((t) => !t.batchId);
    return all.filter((t) => t.batchId === active);
  }, [all, active]);

  const activeBatch = active !== 'all' && active !== 'manual'
    ? batches.find((b) => b.id === active)
    : null;

  async function onDelete(batchId: string, name: string) {
    const count = all.filter((t) => t.batchId === batchId).length;
    const ok = await confirm({
      title: `Delete statement "${truncate(name, 40)}"?`,
      description: (
        <>
          This removes all <b className="text-foreground num">{count}</b>{' '}
          transactions that came from this upload plus the statement record
          itself. Budgets and goals are kept. <b>This cannot be undone.</b>
        </>
      ),
      confirmLabel: 'Delete statement',
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        const res = await deleteBatch(batchId);
        toast.success(`Removed ${res.removed} transactions`);
        setActive('all');
      } catch {
        toast.error('Could not delete statement');
      }
    });
  }

  async function onDeleteManual() {
    const ok = await confirm({
      title: 'Delete all manual & legacy transactions?',
      description: (
        <>
          Removes all <b className="text-foreground num">{manualCount}</b>{' '}
          transactions that were added manually or imported before we started
          tracking statements. Uploaded statements are <b>not</b> affected.
          This cannot be undone.
        </>
      ),
      confirmLabel: `Delete ${manualCount}`,
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        const res = await deleteManualTransactions();
        toast.success(`Removed ${res.removed} transactions`);
        setActive('all');
      } catch {
        toast.error('Could not delete');
      }
    });
  }

  function onRecategorize() {
    startRecatTransition(async () => {
      try {
        const res = await recategorizeAllTransactions();
        const changed = res.updatedByRule + res.updatedByAI;
        if (changed === 0) {
          toast.info(`Scanned ${res.scanned} — nothing to change.`);
        } else {
          toast.success(
            `Re-categorized ${changed} of ${res.scanned} · ${res.updatedByRule} by rules, ${res.updatedByAI} by AI`,
          );
        }
      } catch {
        toast.error('Re-categorize failed');
      }
    });
  }

  async function onDeleteAll() {
    if (all.length === 0) return;
    const ok = await confirm({
      title: 'Delete everything?',
      description: (
        <>
          This removes all <b className="text-foreground num">{all.length}</b>{' '}
          transactions across every statement, plus all{' '}
          <b className="text-foreground num">{batches.length}</b> statement
          records. Budgets and savings goals are kept. Type{' '}
          <span className="font-mono text-destructive">DELETE</span> below to
          confirm.
        </>
      ),
      confirmLabel: 'Delete everything',
      destructive: true,
      requireTyping: 'DELETE',
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        const res = await deleteAllTransactions();
        toast.success(
          `Removed ${res.removedTransactions} transactions and ${res.removedBatches} statements.`,
        );
        setActive('all');
      } catch {
        toast.error('Could not delete');
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-accent" />
            Statements
          </CardTitle>
          <CardDescription>
            {batches.length} uploaded · {manualCount} manual/legacy · {all.length} total
          </CardDescription>
        </div>
        {all.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRecategorize}
            disabled={recatPending}
            className="shrink-0"
            title="Re-run the rule-based categorizer + AI over every transaction"
          >
            {recatPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Re-categorize</span>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* Tab strip */}
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
          <Tab
            active={active === 'all'}
            onClick={() => setActive('all')}
            icon={<Layers className="h-3.5 w-3.5" />}
            label="All"
            count={all.length}
          />
          <Tab
            active={active === 'manual'}
            onClick={() => setActive('manual')}
            icon={<PenLine className="h-3.5 w-3.5" />}
            label="Manual & legacy"
            count={manualCount}
          />
          {batches.map((b) => {
            const Icon = SOURCE_ICON[b.source] ?? FileText;
            return (
              <Tab
                key={b.id}
                active={active === b.id}
                onClick={() => setActive(b.id)}
                icon={<Icon className="h-3.5 w-3.5" />}
                label={truncate(b.name, 28)}
                count={b.txCount ?? 0}
              />
            );
          })}
        </div>

        {/* Batch summary strip (shown when a specific batch is selected) */}
        {activeBatch && (
          <motion.div
            key={activeBatch.id}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-3 rounded-lg border border-border/70 bg-secondary/30 p-4 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{activeBatch.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Imported {format(new Date(activeBatch.createdAt), 'd MMM yyyy, HH:mm')} · source: {activeBatch.source}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="accent">{activeBatch.inserted} imported</Badge>
              {activeBatch.categorizedByRule > 0 && (
                <Badge variant="outline">{activeBatch.categorizedByRule} rule</Badge>
              )}
              {activeBatch.categorizedByAI > 0 && (
                <Badge variant="outline">{activeBatch.categorizedByAI} AI</Badge>
              )}
              {activeBatch.skippedDuplicates > 0 && (
                <Badge variant="warning">{activeBatch.skippedDuplicates} dup skipped</Badge>
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => onDelete(activeBatch.id, activeBatch.name)}
                className="hover:text-destructive"
              >
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete statement
              </Button>
            </div>
          </motion.div>
        )}

        {/* "All" tab: bulk delete-everything (guarded by two confirms) */}
        {active === 'all' && all.length > 0 && (
          <div className="mt-3 rounded-lg border border-destructive/25 bg-destructive/5 p-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Combined view of every statement plus manual entries. Use this button to reset your data — budgets and goals will be kept.
            </p>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={onDeleteAll}
              className="hover:text-destructive shrink-0"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Delete all {all.length}
            </Button>
          </div>
        )}

        {/* Manual-tab hint + bulk delete */}
        {active === 'manual' && manualCount > 0 && (
          <div className="mt-3 rounded-lg border border-border/70 bg-secondary/30 p-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Manually-added transactions and rows imported before we started tracking statements.
            </p>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={onDeleteManual}
              className="hover:text-destructive shrink-0"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Delete all {manualCount}
            </Button>
          </div>
        )}

        {/* Transaction table for the selected tab */}
        <div className="mt-4">
          <TransactionTable rows={activeRows} />
        </div>
      </CardContent>
    </Card>
  );
}

function Tab({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs whitespace-nowrap transition-all shrink-0',
        active
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-border',
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
      <span
        className={cn(
          'rounded-full px-1.5 py-0.5 text-[10px] num',
          active ? 'bg-accent/20' : 'bg-background/60',
        )}
      >
        {count}
      </span>
    </button>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
