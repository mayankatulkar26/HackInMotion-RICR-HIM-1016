'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Copy, Loader2, Send, Sparkles, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { askQuestion } from '@/actions/chat';

type Msg = { id: string; role: 'user' | 'ai'; text: string };

const SUGGESTIONS = [
  'How much did I spend on food this month?',
  'What are my recurring subscriptions?',
  'Am I saving enough compared to last month?',
  'Where should I cut back first?',
];

export function ChatInterface() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pending]);

  async function copyMessage(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1200);
    } catch {
      toast.error('Copy failed');
    }
  }

  function send(question: string) {
    const q = question.trim();
    if (!q || pending) return;
    const id = crypto.randomUUID();
    setMessages((m) => [...m, { id, role: 'user', text: q }]);
    setInput('');

    startTransition(async () => {
      try {
        const answer = await askQuestion(q);
        setMessages((m) => [
          ...m,
          { id: id + '-r', role: 'ai', text: answer },
        ]);
      } catch (err) {
        console.error('[chat] askQuestion failed:', err);
        const msg =
          err instanceof Error
            ? err.message
            : 'Something went wrong. Try again.';
        toast.error(msg);
        setMessages((m) => [
          ...m,
          {
            id: id + '-r',
            role: 'ai',
            text: `Sorry — I couldn't get an answer just now. (${msg})`,
          },
        ]);
      }
    });
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-16rem)] min-h-[380px] sm:h-[540px] lg:max-w-3xl lg:mx-auto">
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-left rounded-lg border border-border/60 bg-secondary/30 p-3 text-sm hover:border-accent/50 hover:bg-secondary/60 transition-all group"
              >
                <span className="text-accent group-hover:translate-x-0.5 inline-block transition-transform">
                  →
                </span>{' '}
                {s}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <span
                className={
                  m.role === 'user'
                    ? 'grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-foreground'
                    : 'grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/15 text-accent'
                }
              >
                {m.role === 'user' ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              </span>
              <div
                className={
                  m.role === 'user'
                    ? 'max-w-[80%] rounded-2xl rounded-tr-sm bg-accent/12 text-foreground px-4 py-2.5 text-sm border border-accent/25'
                    : 'max-w-[80%] rounded-2xl rounded-tl-sm bg-secondary/60 text-foreground px-4 py-2.5 text-sm border border-border/50 whitespace-pre-wrap'
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 whitespace-pre-wrap">{m.text}</div>
                  {m.role === 'ai' && (
                    <button
                      type="button"
                      onClick={() => copyMessage(m.text, m.id)}
                      className="ml-2 mt-0.5 rounded-md border border-border/60 bg-background/40 p-1.5 text-muted-foreground transition hover:text-foreground"
                      aria-label="Copy AI response"
                    >
                      {copiedId === m.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {pending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="rounded-2xl rounded-tl-sm bg-secondary/60 px-4 py-2.5 text-sm border border-border/50">
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking…
              </span>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-4 flex gap-2 border-t border-border/60 pt-4"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your spending, subscriptions, budgets…"
          disabled={pending}
          className="flex-1"
        />
        <Button type="submit" disabled={pending || !input.trim()}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send
        </Button>
      </form>
    </div>
  );
}
