import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function InsightsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Coming Day 2</p>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Month-over-month deltas, spending spikes, and AI recommendations.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { t: 'Spending spikes', d: 'Categories above 130% of 3-month average.' },
          { t: 'Recurring payments', d: 'Detected subscriptions and how much you spend on them.' },
          { t: 'AI recommendations', d: '3-5 specific actions to improve your score.' },
        ].map((x) => (
          <Card key={x.t}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{x.t}</CardTitle>
                <Badge variant="outline">Day 2</Badge>
              </div>
              <CardDescription>{x.d}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed border-border/70 bg-secondary/30 p-6 text-center text-sm text-muted-foreground">
                Shipping in the intelligence pass.
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
