'use client';

import { useMemo, useRef, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertCircle, ArrowRightLeft, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { parseCsv } from '@/lib/csv';
import { parsePdfAction } from '@/actions/pdf';
import { analyzeBankStatement, compareBankStatements, type StatementTransaction } from '@/lib/statement-comparison';

function detectKind(name: string): 'csv' | 'excel' | 'pdf' | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'excel';
  if (lower.endsWith('.pdf')) return 'pdf';
  return null;
}

async function parseStatementFile(file: File): Promise<StatementTransaction[]> {
  const kind = detectKind(file.name);
  if (!kind) {
    throw new Error('Unsupported file type');
  }

  let parsed;
  if (kind === 'csv') {
    parsed = parseCsv(await file.text());
  } else if (kind === 'excel') {
    const { parseExcel } = await import('@/lib/parsers/excel');
    const buffer = await file.arrayBuffer();
    parsed = parseExcel(buffer);
  } else {
    const formData = new FormData();
    formData.append('file', file);
    parsed = await parsePdfAction(formData);
  }

  const rows = parsed.rows
    .map((row) => ({
      amount: row.amount ?? 0,
      type: row.type,
      description: row.description || 'Bank transaction',
    }))
    .filter((row) => row.amount > 0);

  if (rows.length === 0) {
    throw new Error('No readable transaction rows found');
  }

  return rows;
}

function DonutChart({ title, data }: { title: string; data: Array<{ name: string; value: number; color: string }> }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const chartData = data.map((item) => ({ ...item, pct: total > 0 ? (item.value / total) * 100 : 0 }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        <Badge variant="outline" className="shrink-0">
          {formatCurrency(total)}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(180px,220px)_1fr] md:items-center">
        <div className="mx-auto h-44 w-full max-w-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={2}
                stroke="hsl(var(--background))"
                strokeWidth={3}
                isAnimationActive
                animationDuration={500}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(Number(value))}
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2 min-w-0">
          {chartData.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between gap-3 text-sm min-w-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate">{item.name}</span>
              </div>
              <span className="text-muted-foreground shrink-0">{item.pct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ComparisonPage() {
  const [leftFile, setLeftFile] = useState<File | null>(null);
  const [rightFile, setRightFile] = useState<File | null>(null);
  const [leftTransactions, setLeftTransactions] = useState<StatementTransaction[]>([]);
  const [rightTransactions, setRightTransactions] = useState<StatementTransaction[]>([]);
  const [error, setError] = useState<string>('');
  const leftInputRef = useRef<HTMLInputElement>(null);
  const rightInputRef = useRef<HTMLInputElement>(null);

  const leftAnalysis = useMemo(
    () => analyzeBankStatement(leftTransactions),
    [leftTransactions],
  );
  const rightAnalysis = useMemo(
    () => analyzeBankStatement(rightTransactions),
    [rightTransactions],
  );
  const comparison = useMemo(
    () => compareBankStatements(leftAnalysis, rightAnalysis),
    [leftAnalysis, rightAnalysis],
  );

  async function handleUpload(file: File, side: 'left' | 'right') {
    if (!file) return;

    try {
      const parsed = await parseStatementFile(file);
      if (!parsed.length) {
        setError('No readable transaction rows found. Upload a CSV, Excel export, or PDF text output.');
        return;
      }

      if (side === 'left') {
        setLeftFile(file);
        setLeftTransactions(parsed);
      } else {
        setRightFile(file);
        setRightTransactions(parsed);
      }
      setError('');
    } catch {
      setError('Could not read this file. Please use a CSV or text-based bank statement export.');
    }
  }

  const hasData = leftTransactions.length > 0 && rightTransactions.length > 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Bank comparison</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight">Statement comparison</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Upload two bank statements and compare which one is better managed for spending and savings.
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Upload both statements</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            CSV, Excel exports, and PDF text files are supported.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="grid gap-4 lg:grid-cols-2">
            <UploadBox
              label="Statement A"
              file={leftFile}
              onFile={async (file) => handleUpload(file, 'left')}
              inputRef={leftInputRef}
            />
            <UploadBox
              label="Statement B"
              file={rightFile}
              onFile={async (file) => handleUpload(file, 'right')}
              inputRef={rightInputRef}
            />
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {hasData && (
        <>
          <Card className="overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-lg sm:text-xl">Comparison result</CardTitle>
                <Badge
                  variant={comparison.winner === 'left' ? 'success' : comparison.winner === 'right' ? 'accent' : 'default'}
                >
                  {comparison.winner === 'left'
                    ? 'Statement A wins'
                    : comparison.winner === 'right'
                      ? 'Statement B wins'
                      : 'Balanced'}
                </Badge>
              </div>
              <CardDescription className="text-xs sm:text-sm">{comparison.summary}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
                <MetricCard label="Income" value={formatCurrency(comparison.left.totalIncome)} />
                <MetricCard label="Expenses" value={formatCurrency(comparison.left.totalExpense)} />
                <MetricCard label="Savings" value={formatCurrency(comparison.left.netSavings)} />

                <MetricCard label="Income" value={formatCurrency(comparison.right.totalIncome)} />
                <MetricCard label="Expenses" value={formatCurrency(comparison.right.totalExpense)} />
                <MetricCard label="Savings" value={formatCurrency(comparison.right.netSavings)} />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl">Statement A</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Savings rate {leftAnalysis.savingsRate.toFixed(1)}% · expense ratio {leftAnalysis.expenseRatio.toFixed(1)}%
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <DonutChart title="Income vs expenses" data={leftAnalysis.financialMix} />
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl">Statement B</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Savings rate {rightAnalysis.savingsRate.toFixed(1)}% · expense ratio {rightAnalysis.expenseRatio.toFixed(1)}%
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <DonutChart title="Income vs expenses" data={rightAnalysis.financialMix} />
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Quick bank score</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Higher score means stronger savings discipline and more controlled spending.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="grid gap-4 md:grid-cols-2">
                <ScoreCard title="Statement A" analysis={leftAnalysis} />
                <ScoreCard title="Statement B" analysis={rightAnalysis} />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function UploadBox({
  label,
  file,
  onFile,
  inputRef,
}: {
  label: string;
  file: File | null;
  onFile: (file: File) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <label className="flex min-h-[180px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/30 p-4 text-center transition hover:border-accent/60 hover:bg-secondary/40 sm:p-6">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.pdf,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={(event) => event.target.files?.[0] && onFile(event.target.files[0])}
      />
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-lg bg-accent/10 text-accent">
        <UploadCloud className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 max-w-full break-all text-xs text-muted-foreground">
        {file ? file.name : 'Choose a bank statement file'}
      </p>
      <Button type="button" variant="outline" size="sm" className="mt-4 w-full sm:w-auto">
        Upload file
      </Button>
    </label>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function ScoreCard({ title, analysis }: { title: string; analysis: ReturnType<typeof analyzeBankStatement> }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-medium">{title}</h4>
        <Badge variant="accent">{analysis.score}/100</Badge>
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Savings rate</span>
          <span>{analysis.savingsRate.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Expense ratio</span>
          <span>{analysis.expenseRatio.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Net savings</span>
          <span>{formatCurrency(analysis.netSavings)}</span>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <ArrowRightLeft className="h-3.5 w-3.5" />
        {analysis.netSavings >= 0 ? 'Healthy cash flow' : 'Cash flow pressure'}
      </div>
    </div>
  );
}
