import Link from 'next/link';
import { cookies } from 'next/headers';
import { format } from 'date-fns';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Upload,
  PlusCircle,
  TrendingUp,
  CalendarRange,
} from 'lucide-react';
import { listTransactions } from '@/actions/transactions';
import {
  computeHealthScore,
  detectSubscriptions,
  detectUpcomingBills,
  generateAiRecommendations,
  listAvailableMonths,
  monthlyTrend,
  spendingSpikes,
  topCategories,
} from '@/actions/analysis';
import { MonthFilter } from '@/components/dashboard/month-filter';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HealthGauge } from '@/components/charts/health-gauge';
import { SpendingPie } from '@/components/charts/spending-pie';
import { MonthlyTrend } from '@/components/charts/monthly-trend';
import { InsightCards } from '@/components/dashboard/insight-cards';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { UpcomingBills } from '@/components/dashboard/upcoming-bills';
import { EmptyState } from '@/components/dashboard/empty-state';
import { formatCurrency } from '@/lib/utils';
import { monthLabel, normalizeMonthFilter } from '@/lib/dashboard-filter';

export default async function DashboardHome() {
  const filterMonth = normalizeMonthFilter((await cookies()).get('smart-expense-month')?.value ?? null);

  const [score, top, trend, subs, spikes, recs, recent, months, upcomingBills] =
    await Promise.all([
      computeHealthScore({ month: filterMonth }),
      topCategories(6, filterMonth),
      monthlyTrend(6, filterMonth),
      detectSubscriptions(filterMonth),
      spendingSpikes(filterMonth),
      generateAiRecommendations(filterMonth),
      listTransactions({
        limit: 6,
        from: filterMonth ? `${filterMonth}-01` : undefined,
        to: filterMonth ? `${filterMonth}-31` : undefined,
      }),
      listAvailableMonths(),
      // Bills are inherently forward-looking; ignore the selected-month
      // filter and always look at the next 30 days from today.
      detectUpcomingBills(30),
    ]);

  const hasData = score.metrics.income > 0 || score.metrics.expense > 0;
  const saved = score.metrics.income - score.metrics.expense;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Financial Overview
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1">
            Dashboard
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] sm:text-xs text-muted-foreground">
            <CalendarRange className="h-3.5 w-3.5 shrink-0" />
            <span>
              KPIs, score &amp; pie use{' '}
              <b className="text-foreground">{filterMonth ? monthLabel(filterMonth) : 'all your transactions'}</b>{' '}
              · trend uses 6 months · budgets &amp; spikes are per-month
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <MonthFilter current={filterMonth} months={months} />
          <Button asChild variant="outline" className="flex-1 sm:flex-none">
            <Link href="/transactions?tab=csv">
              <Upload className="h-4 w-4" />
              <span className="hidden xs:inline">Import</span>
            </Link>
          </Button>
          <Button asChild className="flex-1 sm:flex-none">
            <Link href="/transactions?tab=manual">
              <PlusCircle className="h-4 w-4" />
              <span>Add transaction</span>
            </Link>
          </Button>
        </div>
      </div>

      {!hasData ? (
        <EmptyState
          title="No transactions yet"
          description="Add your first transaction or import a CSV to see your financial health, spending breakdown, and personalized insights."
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
                <CardTitle className="text-base font-medium">
                  {filterMonth ? monthLabel(filterMonth) : 'All time'}
                </CardTitle>
              </CardHeader>
              <HealthGauge value={score.total} size={220} />
              <div className="mt-6 grid grid-cols-5 gap-1.5 w-full text-center">
                <ScoreCell label="Save" value={score.breakdown.savings} max={30} />
                <ScoreCell label="Budget" value={score.breakdown.budgetAdherence} max={25} />
                <ScoreCell label="Stable" value={score.breakdown.stability} max={20} />
                <ScoreCell label="Subs" value={score.breakdown.subscriptions} max={15} />
                <ScoreCell label="Goals" value={score.breakdown.emergencyFund} max={10} />
              </div>
              {score.breakdown.solvencyPenalty < 0 && (
                <div className="mt-3 w-full rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-center">
                  <p className="text-xs text-destructive font-medium">
                    Solvency penalty: <span className="num font-semibold">{score.breakdown.solvencyPenalty}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {score.metrics.income === 0
                      ? 'No tracked income while spending is happening.'
                      : 'Spending is running above income.'}
                  </p>
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KPI
                label="Income"
                value={score.metrics.income}
                icon={<ArrowUpRight className="h-4 w-4" />}
                positive
              />
              <KPI
                label="Expenses"
                value={score.metrics.expense}
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
                      {(score.metrics.savingsRate * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      of income kept this period · transfers excluded
                    </p>
                  </div>
                  <div className="text-accent">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-700"
                    style={{
                      width: `${Math.min(100, score.metrics.savingsRate * 100)}%`,
                    }}
                  />
                </div>
              </Card>
            </div>
          </div>

          {/* Row 2 — Insight cards */}
          <InsightCards
            recommendations={recs}
            spikes={spikes}
            subscriptions={subs}
          />

          {/* Row 2b — Upcoming bills (only render when we actually predicted any) */}
          {upcomingBills.length > 0 && <UpcomingBills bills={upcomingBills} />}

          {/* Row 3 — Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Where money goes</CardTitle>
                <CardDescription>Top categories this month</CardDescription>
              </CardHeader>
              <CardContent>
                <SpendingPie data={top} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Income vs expense</CardTitle>
                <CardDescription>Last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <MonthlyTrend data={trend} />
              </CardContent>
            </Card>
          </div>

          {/* Row 4 — Recent */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent transactions</CardTitle>
                <CardDescription>Latest 6 across all your imports</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/transactions">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <RecentTransactions rows={recent} />
            </CardContent>
          </Card>
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

function ScoreCell({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? value / max : 0;
  const color = pct >= 0.66 ? 'text-success' : pct >= 0.33 ? 'text-warning' : 'text-destructive';
  return (
    <div className="rounded-md bg-secondary/40 py-2">
      <p className={`text-sm font-semibold num ${color}`}>
        {value}
        <span className="text-[10px] text-muted-foreground font-normal">
          /{max}
        </span>
      </p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
        {label}
      </p>
    </div>
  );
}
