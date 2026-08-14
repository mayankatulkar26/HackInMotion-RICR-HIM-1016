import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatInterface } from '@/components/chat/chat-interface';
import { isGeminiConfigured } from '@/lib/gemini';

export default function ChatPage() {
  const enabled = isGeminiConfigured();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          AI Assistant
        </p>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">Ask your money</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Answered from your real transactions — recent activity, top merchants, monthly breakdowns, budgets, and detected subscriptions.
        </p>
      </div>

      {!enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No AI provider configured</CardTitle>
            <CardDescription>
              Add either <code className="text-accent">GEMINI_API_KEY</code> or{' '}
              <code className="text-accent">GROQ_API_KEY</code> to your <code>.env</code> and restart the dev server to enable AI chat and recommendations. Setting both is fine — Gemini is tried first and Groq is the fallback. Free keys at{' '}
              <a
                className="text-accent underline"
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
              >
                aistudio.google.com/apikey
              </a>{' '}
              and{' '}
              <a
                className="text-accent underline"
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
              >
                console.groq.com/keys
              </a>.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Chat</CardTitle>
          <CardDescription>
            Try: &ldquo;How much at BigBasket in July?&rdquo;, &ldquo;What did I spend on Aug 5?&rdquo;, &ldquo;My top 3 merchants?&rdquo;, &ldquo;Food spend last month vs this month?&rdquo;
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChatInterface />
        </CardContent>
      </Card>
    </div>
  );
}
