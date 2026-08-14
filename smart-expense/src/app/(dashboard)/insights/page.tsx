import {
  computeHealthScore,
  detectSubscriptions,
  detectUpcomingBills,
  getBenchmarkComparison,
  monthlyTrend,
  spendingSpikes,
  topCategories,
} from '@/actions/analysis';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SpendingPie } from '@/components/charts/spending-pie';
import { MonthlyTrend } from '@/components/charts/monthly-trend';
import { SavingsSimulator } from '@/components/insights/savings-simulator';
import { BenchmarkComparison } from '@/components/insights/benchmark-comparison';
import { UpcomingBills } from '@/components/dashboard/upcoming-bills';
import { formatCurrency } from '@/lib/utils';
import { categoryColor } from '@/lib/categories';
import { TrendingUp, AlertTriangle, Repeat } from 'lucide-react';

export default async function InsightsPage() {
  const [score, top, trend, subs, spikes, upcomingBills, benchmark] =
    await Promise.all([
      computeHealthScore(),
      topCategories(8),
      monthlyTrend(6),
      detectSubscriptions(),
      spendingSpikes(),
      detectUpcomingBills(30),
      getBenchmarkComparison(),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Deep dive
        </p>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every number here is aggregated live from your transactions.
        </p>
      </div>

      {/* Score breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Health score breakdown</CardTitle>
          <CardDescription>
            How your {score.total}/100 was calculated
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScoreBar
            label="Savings rate"
            value={score.breakdown.savings}
            max={30}
            hint={`${(score.metrics.savingsRate * 100).toFixed(1)}% of income kept`}
          />
          <ScoreBar
            label="Budget adherence"
            value={score.breakdown.budgetAdherence}
            max={25}
            hint={
              score.metrics.budgetsTotal === 0
                ? 'No budgets set (neutral score)'
                : `${score.metrics.budgetsMet} of ${score.metrics.budgetsTotal} budgets met`
            }
          />
          <ScoreBar
            label="Expense stability"
            value={score.breakdown.stability}
            max={20}
            hint={`Coefficient of variation ${score.metrics.stabilityCv.toFixed(2)}`}
          />
          <ScoreBar
            label="Subscriptions ratio"
            value={score.breakdown.subscriptions}
            max={15}
            hint={`${(score.metrics.subscriptionRatio * 100).toFixed(0)}% of expense recurring`}
          />
          <ScoreBar
            label="Goal progress"
            value={score.breakdown.emergencyFund}
            max={10}
            hint={`${(score.metrics.goalProgress * 100).toFixed(0)}% average across goals`}
          />
          {score.breakdown.solvencyPenalty < 0 && (
            <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-destructive">
                  Solvency penalty
                </span>
                <span className="num font-semibold text-destructive">
                  {score.breakdown.solvencyPenalty}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Great habits shouldn&apos;t hide broken fundamentals.
                {' '}
                {score.metrics.income === 0
                  ? 'You have spending recorded but no income — either log your salary or tag more inflows as non-Transfer.'
                  : 'Expenses are exceeding income this month.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Peer benchmark */}
      <BenchmarkComparison initial={benchmark} />

      {/* Upcoming bills — rendered here as well as on the dashboard so
          users can see the full 30-day view without leaving Insights. */}
      {upcomingBills.length > 0 && <UpcomingBills bills={upcomingBills} />}

      {/* Simulator + Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SavingsSimulator
          topCategories={top}
          income={score.metrics.income}
          expense={score.metrics.expense}
        />

        <Card>
          <CardHeader>
            <CardTitle>Where money goes</CardTitle>
            <CardDescription>Top categories this month</CardDescription>
          </CardHeader>
          <CardContent>
            <SpendingPie data={top} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Income vs expense</CardTitle>
          <CardDescription>Last 6 months, transfers excluded</CardDescription>
        </CardHeader>
        <CardContent>
          <MonthlyTrend data={trend} />
        </CardContent>
      </Card>

      {/* Spikes and subscriptions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Spending spikes</CardTitle>
                <CardDescription>
                  Categories &gt;130% of your 3-month average
                </CardDescription>
              </div>
              <Badge variant="warning" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {spikes.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {spikes.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No spikes detected. You&apos;re spending steadily.
              </p>
            ) : (
              <ul className="space-y-2">
                {spikes.map((s) => (
                  <li
                    key={s.category}
                    className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/5 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{s.category}</p>
                      <p className="text-xs text-muted-foreground num">
                        {formatCurrency(s.current)} · avg {formatCurrency(s.average)}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-1 text-xs font-semibold text-warning">
                      <TrendingUp className="h-3 w-3" />
                      +{Math.round((s.ratio - 1) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Detected subscriptions</CardTitle>
                <CardDescription>
                  Recurring merchants with ≥3 hits at similar amounts
                </CardDescription>
              </div>
              <Badge variant="accent" className="gap-1">
                <Repeat className="h-3 w-3" />
                {subs.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {subs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nothing recurring detected yet. Add a few months of data.
              </p>
            ) : (
              <ul className="space-y-2">
                {subs.map((s) => (
                  <li
                    key={s.merchant + s.amount}
                    className="flex items-center justify-between rounded-lg border border-border/60 p-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: categoryColor(s.category) }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.merchant}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.category} · {s.count} hits
                          {s.stale && (
                            <span className="ml-2 text-warning">· stale</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold num shrink-0">
                      {formatCurrency(s.monthlyEstimate)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ScoreBar({
  label,
  value,
  max,
  hint,
}: {
  label: string;
  value: number;
  max: number;
  hint: string;
}) {
  const pct = (value / max) * 100;
  const color =
    pct >= 66 ? 'bg-success' : pct >= 33 ? 'bg-warning' : 'bg-destructive';
  return (
    <div className="py-3 border-b border-border/40 last:border-0">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="num">
          <span className="text-foreground font-semibold">{value}</span>
          <span className="text-muted-foreground">/{max}</span>
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
