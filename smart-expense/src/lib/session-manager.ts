type Msg = { id: string; role: 'user' | 'ai'; text: string };

export interface ChatSession {
  id: string;
  name: string;
  messages: Msg[];
  createdAt: number;
  hasName: boolean; // Track if name was auto-generated from first question
}

const SESSIONS_STORAGE_KEY = 'wealth-sight-sessions';
const CURRENT_SESSION_KEY = 'wealth-sight-current-session-id';

export class SessionManager {
  static getSessions(): ChatSession[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.sessionStorage.getItem(SESSIONS_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static getCurrentSessionId(): string | null {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(CURRENT_SESSION_KEY);
  }

  static getCurrentSession(): ChatSession | null {
    const sessions = this.getSessions();
    const currentId = this.getCurrentSessionId();
    if (!currentId) return null;
    return sessions.find((s) => s.id === currentId) || null;
  }

  static createSession(name?: string): ChatSession {
    const now = Date.now();
    const id = `session-${now}-${Math.random().toString(36).slice(2, 9)}`;
    const displayName = name || 'New Chat';

    const newSession: ChatSession = {
      id,
      name: displayName,
      messages: [],
      createdAt: now,
      hasName: !!name, // true if explicitly named, false if default
    };

    const sessions = this.getSessions();
    sessions.push(newSession);

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
      window.sessionStorage.setItem(CURRENT_SESSION_KEY, id);
    }

    return newSession;
  }

  static setCurrentSession(sessionId: string): ChatSession | null {
    const session = this.getSessions().find((s) => s.id === sessionId);
    if (!session) return null;

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(CURRENT_SESSION_KEY, sessionId);
    }

    return session;
  }

  static updateSessionMessages(sessionId: string, messages: Msg[]): boolean {
    const sessions = this.getSessions();
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx === -1) return false;

    sessions[idx].messages = messages;

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    }

    return true;
  }

  static deleteSession(sessionId: string): boolean {
    const sessions = this.getSessions();
    const filtered = sessions.filter((s) => s.id !== sessionId);

    if (filtered.length === sessions.length) return false;

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(filtered));

      const currentId = this.getCurrentSessionId();
      if (currentId === sessionId) {
        const newCurrent = filtered.length > 0 ? filtered[0].id : null;
        if (newCurrent) {
          window.sessionStorage.setItem(CURRENT_SESSION_KEY, newCurrent);
        } else {
          window.sessionStorage.removeItem(CURRENT_SESSION_KEY);
        }
      }
    }

    return true;
  }

  static clearAllSessions(): void {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(SESSIONS_STORAGE_KEY);
      window.sessionStorage.removeItem(CURRENT_SESSION_KEY);
    }
  }

  static renameSession(sessionId: string, newName: string): boolean {
    const sessions = this.getSessions();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return false;

    session.name = newName;
    session.hasName = true;

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    }

    return true;
  }
}
