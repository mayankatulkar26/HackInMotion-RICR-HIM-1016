'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Copy, Loader2, MessageSquareText, Plus, Send, Sparkles, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { askQuestion } from '@/actions/chat';
import { SessionManager, type ChatSession } from '@/lib/session-manager';

type Msg = { id: string; role: 'user' | 'ai'; text: string };

const SUGGESTIONS = [
  'How much did I spend on food this month?',
  'What are my recurring subscriptions?',
  'Am I saving enough compared to last month?',
  'Where should I cut back first?',
];

export function ChatInterface() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initialize sessions on mount
  useEffect(() => {
    const allSessions = SessionManager.getSessions();
    let activeSessionId = SessionManager.getCurrentSessionId();

    // If no sessions exist, create one
    if (allSessions.length === 0) {
      const newSession = SessionManager.createSession();
      setSessions([newSession]);
      setCurrentSessionId(newSession.id);
      setMessages(newSession.messages);
    } else {
      setSessions(allSessions);
      
      // If no active session, set the first one
      if (!activeSessionId || !allSessions.find((s) => s.id === activeSessionId)) {
        activeSessionId = allSessions[0].id;
        SessionManager.setCurrentSession(activeSessionId);
      }

      setCurrentSessionId(activeSessionId);
      const currentSession = allSessions.find((s) => s.id === activeSessionId);
      setMessages(currentSession?.messages || []);
    }
  }, []);

  // Save messages to current session
  useEffect(() => {
    if (currentSessionId) {
      SessionManager.updateSessionMessages(currentSessionId, messages);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId ? { ...s, messages } : s
        )
      );
    }
  }, [messages, currentSessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pending]);

  function createNewSession() {
    const newSession = SessionManager.createSession();
    setSessions([...sessions, newSession]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    toast.success('New session created');
  }

  function switchSession(sessionId: string) {
    const session = SessionManager.setCurrentSession(sessionId);
    if (session) {
      setCurrentSessionId(session.id);
      setMessages(session.messages);
    }
  }

  function deleteSession(sessionId: string) {
    if (sessions.length === 1) {
      toast.error('Cannot delete the last session');
      return;
    }

    SessionManager.deleteSession(sessionId);
    const updatedSessions = sessions.filter((s) => s.id !== sessionId);
    setSessions(updatedSessions);

    if (currentSessionId === sessionId) {
      const newActive = updatedSessions[0];
      setCurrentSessionId(newActive.id);
      setMessages(newActive.messages);
    }

    toast.success('Session deleted');
  }

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
    if (!q || pending || !currentSessionId) return;

    // Auto-name session on first message
    const currentSession = sessions.find((s) => s.id === currentSessionId);
    if (currentSession && !currentSession.hasName && currentSession.messages.length === 0) {
      const sessionName = q.length > 50 ? q.substring(0, 50) + '...' : q;
      SessionManager.renameSession(currentSessionId, sessionName);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId ? { ...s, name: sessionName, hasName: true } : s
        )
      );
    }

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
    <div className="mx-auto w-full max-w-6xl">
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-border/60 bg-secondary/30 p-3 h-fit sticky top-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-accent" />
              <p className="text-sm font-medium">Sessions</p>
            </div>
            <button
              onClick={createNewSession}
              className="rounded-md bg-accent/20 p-1 hover:bg-accent/30 transition"
              title="Create new session"
            >
              <Plus className="h-3.5 w-3.5 text-accent" />
            </button>
          </div>

          <div className="space-y-2">
            {sessions.length === 0 && (
              <p className="px-2 text-xs text-muted-foreground">No sessions yet.</p>
            )}

            {sessions.map((session) => (
              <div
                key={session.id}
                className={`rounded-xl border transition-all ${
                  currentSessionId === session.id
                    ? 'border-accent/50 bg-accent/10'
                    : 'border-transparent bg-background/40 hover:border-border/70 hover:bg-background/60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => switchSession(session.id)}
                  className="w-full p-2.5 text-left"
                >
                  <p className="truncate text-sm font-medium text-foreground">{session.name}</p>
                </button>
                {sessions.length > 1 && (
                  <button
                    onClick={() => deleteSession(session.id)}
                    className="w-full px-2.5 pb-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>

        <div className="flex flex-col h-[calc(100dvh-16rem)] min-h-[380px] sm:h-[540px]">
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
      </div>
    </div>
  );
}
