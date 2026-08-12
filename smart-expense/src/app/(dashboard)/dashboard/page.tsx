import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, Upload, PlusCircle } from 'lucide-react';
import { transactionStats, listTransactions } from '@/actions/transactions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HealthGauge } from '@/components/charts/health-gauge';
import { formatCurrency } from '@/lib/utils';
import { EmptyState } from '@/components/dashboard/empty-state';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';

export default async function DashboardHome() {
  const [stats, recent] = await Promise.all([
    transactionStats(),
    listTransactions({ limit: 6 }),
  ]);

  const hasData = (stats.total ?? 0) > 0;
  const income = Number(stats.income ?? 0);
  const expense = Number(stats.expense ?? 0);
  const saved = income - expense;
  const savingsRate = income > 0 ? Math.max(0, (saved / income) * 100) : 0;

  // Placeholder health score (Day 2 replaces with real calc).
  // Blends savings rate + expense discipline for a directional number.
  const score = hasData
    ? Math.round(Math.min(100, savingsRate * 0.6 + (expense > 0 ? 30 : 0) + 10))
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Financial Overview
          </p>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/transactions">
              <Upload className="h-4 w-4" /> Import CSV
            </Link>
          </Button>
          <Button asChild>
            <Link href="/transactions">
              <PlusCircle className="h-4 w-4" /> Add transaction
            </Link>
          </Button>
        </div>
      </div>

      {!hasData ? (
        <EmptyState
          title="No transactions yet"
          description="Add your first transaction or upload a CSV to see your financial health, spending breakdown, and personalized insights."
          ctaHref="/transactions"
          ctaLabel="Add transactions"
        />
      ) : (
        <>
          {/* Row 1 — Score + KPIs */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <Card className="p-6 flex flex-col items-center">
              <CardHeader className="text-center p-0 mb-4">
                <CardDescription className="uppercase tracking-wider text-xs">
                  Financial Health
                </CardDescription>
                <CardTitle className="text-base font-medium">This month</CardTitle>
              </CardHeader>
              <HealthGauge value={score} size={220} />
              <p className="mt-4 text-sm text-muted-foreground text-center max-w-xs">
                A quick blend of your savings and spending. Day-2 upgrade layers in
                budgets, stability, and subscriptions.
              </p>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KPI
                label="Income"
                value={income}
                icon={<ArrowUpRight className="h-4 w-4" />}
                positive
              />
              <KPI
                label="Expenses"
                value={expense}
                icon={<ArrowDownRight className="h-4 w-4" />}
              />
              <KPI
                label="Saved"
                value={saved}
                icon={<Wallet className="h-4 w-4" />}
                positive={saved >= 0}
              />
              <Card className="sm:col-span-3 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Savings rate
                    </p>
                    <p className="text-3xl font-semibold num mt-1">
                      {savingsRate.toFixed(1)}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      of income kept this period
                    </p>
                  </div>
                  <div className="text-accent">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-emerald-400 transition-all"
                    style={{ width: `${Math.min(100, savingsRate)}%` }}
                  />
                </div>
              </Card>
            </div>
          </div>

          {/* Row 2 — Recent + charts placeholders */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent transactions</CardTitle>
                  <CardDescription>
                    Latest 6 across all your imports
                  </CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/transactions">View all</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <RecentTransactions rows={recent} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Charts arrive Day 2</CardTitle>
                <CardDescription>
                  Spending pie · Monthly trend · Budget bars
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {['Pie: Top categories', 'Line: Monthly trend', 'Bars: Budgets'].map(
                    (t) => (
                      <div
                        key={t}
                        className="rounded-lg border border-dashed border-border/70 bg-secondary/30 p-4 text-sm text-muted-foreground"
                      >
                        {t}
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function KPI({
  label,
  value,
  icon,
  positive,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  positive?: boolean;
}) {
  return (
    <Card className="p-5 hover:shadow-soft-lg transition-shadow">
      <div className="flex items-start justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span
          className={
            positive
              ? 'text-success bg-success/10 rounded-md p-1'
              : 'text-muted-foreground bg-secondary rounded-md p-1'
          }
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold num">{formatCurrency(value)}</p>
    </Card>
  );
}
