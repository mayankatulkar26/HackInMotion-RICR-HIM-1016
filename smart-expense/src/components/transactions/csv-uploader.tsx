'use client';

import { useRef, useState, useTransition } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { parseCsv, type ParsedRow } from '@/lib/csv';
import { importTransactions } from '@/actions/transactions';
import { cn, formatCurrency } from '@/lib/utils';

export function CsvUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleFile(file: File) {
    if (!file.name.match(/\.csv$/i)) {
      toast.error('Please select a .csv file');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const parsed = parseCsv(text);
      setRows(parsed.rows);
      setFileName(file.name);
      const invalid = parsed.rows.filter((r) => r.warnings.length > 0).length;
      toast.success(
        `Parsed ${parsed.rows.length} rows${invalid ? ` (${invalid} with warnings)` : ''}`,
      );
    };
    reader.readAsText(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  async function onImport() {
    if (!rows) return;
    const toImport = rows
      .filter((r) => r.date && r.amount && r.description)
      .map((r) => ({
        date: r.date!,
        amount: r.amount!,
        description: r.description,
        type: r.type,
        warnings: r.warnings,
      }));

    if (toImport.length === 0) {
      toast.error('No importable rows.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await importTransactions(toImport);
        toast.success(
          `Imported ${res.inserted}. ${res.categorizedByRule} rule + ${res.categorizedByAI} AI · ${res.skippedDuplicates} dup skipped.`,
        );
        setRows(null);
        setFileName('');
        if (inputRef.current) inputRef.current.value = '';
      } catch (err) {
        toast.error('Import failed. Try again.');
      }
    });
  }

  if (!rows) {
    return (
      <div className="mt-4">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all',
            dragOver
              ? 'border-accent bg-accent/5'
              : 'border-border/70 hover:border-accent/50 hover:bg-secondary/30',
          )}
        >
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-accent/10 text-accent">
            <Upload className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium">Drop your CSV here</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              or click to browse · headers we understand: date, description,
              amount, debit/credit, type
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>

        <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <FileSpreadsheet className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Handles messy data: multiple date formats, negative amounts, missing
            fields — you'll get a preview before anything is saved.
          </p>
        </div>
      </div>
    );
  }

  const importable = rows.filter((r) => r.date && r.amount && r.description);
  const warned = rows.filter((r) => r.warnings.length > 0);

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{fileName}</p>
          <p className="text-xs text-muted-foreground">
            {importable.length} importable · {warned.length} with warnings
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRows(null);
              setFileName('');
              if (inputRef.current) inputRef.current.value = '';
            }}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={onImport} disabled={pending || importable.length === 0}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Importing…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Import {importable.length}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 overflow-hidden">
        <div className="max-h-[400px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 sticky top-0 backdrop-blur">
              <tr>
                <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Date
                </th>
                <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Description
                </th>
                <th className="text-right px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Amount
                </th>
                <th className="text-center px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Type
                </th>
                <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rows.slice(0, 200).map((r) => (
                <tr
                  key={r.rowIndex}
                  className={cn(
                    'hover:bg-secondary/30 transition-colors',
                    r.warnings.length > 0 && 'bg-warning/5',
                  )}
                >
                  <td className="px-3 py-2 text-xs">
                    {r.date ? format(r.date, 'd MMM yyyy') : (
                      <span className="text-warning">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{r.description || <span className="text-warning">missing</span>}</td>
                  <td className="px-3 py-2 text-right num">
                    {r.amount !== null ? formatCurrency(r.amount) : (
                      <span className="text-warning">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Badge variant={r.type === 'credit' ? 'success' : 'default'}>
                      {r.type}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.warnings.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-warning">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {r.warnings.join(' · ')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">ok</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 200 && (
          <p className="p-3 text-xs text-muted-foreground text-center border-t border-border/50">
            Showing first 200 of {rows.length}. All rows will be processed on import.
          </p>
        )}
      </div>
    </div>
  );
}
