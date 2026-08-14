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
          Questions are answered from your actual transactions, budgets, and detected subscriptions.
        </p>
      </div>

      {!enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gemini API key not set</CardTitle>
            <CardDescription>
              Add <code className="text-accent">GEMINI_API_KEY</code> to your <code>.env</code> and restart the dev server to enable AI chat and recommendations. Get a free key at{' '}
              <a
                className="text-accent underline"
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
              >
                aistudio.google.com/apikey
              </a>.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Chat</CardTitle>
          <CardDescription>
            Try: &ldquo;How much did I spend on food last month?&rdquo;, &ldquo;What are my subscriptions?&rdquo;, &ldquo;Where can I cut down?&rdquo;
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChatInterface />
        </CardContent>
      </Card>
    </div>
  );
}
