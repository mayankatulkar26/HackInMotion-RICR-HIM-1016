import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Coming Day 2</p>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">AI Chat</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ask questions about your spending, grounded in your real data.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ask your money anything</CardTitle>
          <CardDescription>Powered by Gemini · shipping Day 2</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {[
              'How much did I spend on food last month?',
              'What are my recurring subscriptions?',
              'Am I on track for my emergency fund?',
            ].map((q) => (
              <div
                key={q}
                className="rounded-lg border border-border/70 bg-secondary/30 p-4 flex items-center gap-3"
              >
                <MessageCircle className="h-4 w-4 text-accent shrink-0" />
                <p className="text-sm text-muted-foreground">{q}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
