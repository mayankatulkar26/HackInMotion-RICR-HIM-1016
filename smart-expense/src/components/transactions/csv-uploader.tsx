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
import { parsePdfAction } from '@/actions/pdf';
import { cn, formatCurrency } from '@/lib/utils';

type FileKind = 'csv' | 'excel' | 'pdf';

function detectKind(name: string): FileKind | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'excel';
  if (lower.endsWith('.pdf')) return 'pdf';
  return null;
}

export function CsvUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileKind, setFileKind] = useState<FileKind | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [pending, startTransition] = useTransition();

  async function handleFile(file: File) {
    const kind = detectKind(file.name);
    if (!kind) {
      toast.error('Please select a .csv, .xlsx, .xls, or .pdf file');
      return;
    }

    setParsing(true);
    try {
      if (kind === 'csv') {
        const text = await file.text();
        const parsed = parseCsv(text);
        setRows(parsed.rows);
      } else if (kind === 'excel') {
        // Dynamic import so the xlsx bundle only loads when needed
        const { parseExcel } = await import('@/lib/parsers/excel');
        const buffer = await file.arrayBuffer();
        const parsed = parseExcel(buffer);
        setRows(parsed.rows);
      } else {
        // PDF → server action (unpdf runs on Node, keeps client bundle small)
        const fd = new FormData();
        fd.append('file', file);
        const parsed = await parsePdfAction(fd);
        if (parsed.errors.length > 0) {
          // Show the headline error + text preview if the parser returned one
          toast.error(parsed.errors[0], {
            description: parsed.errors[1],
            duration: 10_000,
          });
        }
        setRows(parsed.rows);
      }
      setFileName(file.name);
      setFileKind(kind);
    } catch (err) {
      console.error(err);
      toast.error('Could not read that file');
      setRows(null);
    } finally {
      setParsing(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
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
        const res = await importTransactions(toImport, {
          fileName,
          source: fileKind ?? 'csv',
        });
        toast.success(
          `Imported ${res.inserted}`,
          {
            description: [
              `${res.categorizedByRule} by rules`,
              `${res.categorizedByAI} by AI`,
              res.categorizedByFallback > 0 &&
                `${res.categorizedByFallback} by smart fallback`,
              res.skippedDuplicates > 0 &&
                `${res.skippedDuplicates} dup skipped`,
            ]
              .filter(Boolean)
              .join(' · '),
            duration: 6000,
          },
        );
        reset();
      } catch {
        toast.error('Import failed. Try again.');
      }
    });
  }

  function reset() {
    setRows(null);
    setFileName('');
    setFileKind(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  if (parsing && !rows) {
    return (
      <div className="mt-4 grid place-items-center rounded-xl border-2 border-dashed border-accent/50 bg-secondary/30 p-6 sm:p-10 text-center">
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-accent" />
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm font-medium">Reading your file…</p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF extraction takes a few seconds
        </p>
      </div>
    );
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
            'flex flex-col items-center justify-center gap-2 sm:gap-3 rounded-xl border-2 border-dashed p-6 sm:p-10 text-center cursor-pointer transition-all',
            dragOver
              ? 'border-accent bg-accent/5'
              : 'border-border/70 hover:border-accent/50 hover:bg-secondary/30',
          )}
        >
          <div className="grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-lg bg-accent/10 text-accent">
            <Upload className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium">Drop your statement here</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              CSV, Excel (.xlsx/.xls) and PDF
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,.pdf,application/pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])}
          />
        </label>

        <div className="mt-2 sm:mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <FileSpreadsheet className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 mt-0.5" />
          <p>
            Handles messy data: multiple date formats, negative amounts, missing fields. PDFs are best-effort. You'll see a preview before saving.
          </p>
        </div>
      </div>
    );
  }

  const importable = rows.filter((r) => r.date && r.amount && r.description);
  const warned = rows.filter((r) => r.warnings.length > 0);
  const kindLabel = fileKind === 'excel' ? 'Excel' : fileKind === 'pdf' ? 'PDF' : 'CSV';

  return (
    <div className="mt-4 space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <p
              className="text-xs sm:text-sm font-medium truncate min-w-0"
              title={fileName}
            >
              {fileName}
            </p>
            <Badge variant="outline" className="text-[10px] shrink-0">
              {kindLabel}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {importable.length} importable · {warned.length} with warnings
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="ghost" size="sm" className="text-xs sm:text-sm" onClick={reset}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="text-xs sm:text-sm"
            onClick={onImport}
            disabled={pending || importable.length === 0}
          >
            {pending ? (
              <>
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> Importing…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" /> Import {importable.length}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 overflow-x-auto">
        <div className="max-h-[400px] overflow-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-secondary/40 sticky top-0 backdrop-blur">
              <tr>
                <th className="text-left px-2 sm:px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Date
                </th>
                <th className="text-left px-2 sm:px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Description
                </th>
                <th className="text-right px-2 sm:px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Amount
                </th>
                <th className="text-center px-1 sm:px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Type
                </th>
                <th className="text-left px-2 sm:px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap hidden sm:table-cell">
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
                  <td className="px-2 sm:px-3 py-2 text-xs whitespace-nowrap">
                    {r.date ? format(r.date, 'd MMM') : (
                      <span className="text-warning">—</span>
                    )}
                  </td>
                  <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm max-w-[80px] sm:max-w-none truncate">{r.description || <span className="text-warning">missing</span>}</td>
                  <td
                    className={cn(
                      'px-2 sm:px-3 py-2 text-right text-xs sm:text-sm font-mono',
                      r.type === 'debit' ? 'text-destructive' : 'text-success',
                    )}
                  >
                    {r.amount !== null ? (
                      (r.type === 'debit' ? '-' : '') + formatCurrency(Math.abs(r.amount)) 
                    ) : (
                      <span className="text-warning">—</span>
                    )}
                  </td>
                  <td className="px-1 sm:px-3 py-2 text-center">
                    <Badge variant={r.type === 'credit' ? 'success' : 'default'} className="text-xs">
                      <span className={r.type === 'debit' ? 'text-destructive' : ''}>
                        {r.type.slice(0, 3)}
                      </span>
                    </Badge>
                  </td>
                  <td className="px-2 sm:px-3 py-2 text-xs hidden sm:table-cell">
                    {r.warnings.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-warning">
                        <AlertTriangle className="h-3 w-3" />
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
          <p className="p-2 sm:p-3 text-xs text-muted-foreground text-center border-t border-border/50">
            Showing first 200 of {rows.length}. All will be processed on import.
          </p>
        )}
      </div>
    </div>
  );
}
