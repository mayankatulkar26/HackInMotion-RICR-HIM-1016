import { GoogleGenerativeAI } from '@google/generative-ai';
import { CATEGORIES, type Category } from './categories';

/* ==========================================================================
 * Provider router
 * --------------------------------------------------------------------------
 * The three high-level helpers below (categorizeWithGemini,
 * generateRecommendations, chatWithData) all go through `callTextAi()`,
 * which tries Gemini first and falls back to Groq (OpenAI-compatible) on
 * any failure — quota, 503, network. Either key can be missing.
 *
 * Ordering rationale: Gemini is preferred because Flash is fast and the
 * app's prompts are tuned for it. Groq's llama-3.3-70b is a strong-enough
 * backup for both structured (categorization JSON) and prose (chat) tasks.
 *
 * If both providers are missing / fail, we return provider-specific
 * fallbacks so callers never see an unhandled throw.
 * ========================================================================== */

const geminiKey = process.env.GEMINI_API_KEY;
const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

const groqKey = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/** True if at least one provider key is set. */
export function isGeminiConfigured(): boolean {
  return Boolean(genAI) || Boolean(groqKey);
}

/**
 * Gemini's 429 quota error is not transient for the free tier. Retry once for
 * overloaded responses, but stop immediately when the API says the quota was
 * exhausted so the app can surface a clear explanation instead of wasting the
 * user's remaining requests.
 */
export function isGeminiQuotaExceededError(err: any): boolean {
  if (!err) return false;

  const status = err?.status ?? err?.response?.status ?? err?.cause?.status;
  const detailText = JSON.stringify(err?.errorDetails ?? err?.error ?? err?.cause ?? {})
    .toLowerCase();
  const messageText = [
    err?.message,
    err?.error?.message,
    err?.cause?.message,
    err?.response?.data?.error?.message,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const quotaMatch =
    status === 429 ||
    detailText.includes('quota') ||
    detailText.includes('quotafailure') ||
    messageText.includes('quota') ||
    messageText.includes('rate limit') ||
    messageText.includes('exceeded your current quota');

  return quotaMatch;
}

async function callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status ?? err?.cause?.status;

    if (isGeminiQuotaExceededError(err)) {
      throw new Error(
        'Gemini API quota exceeded. Please wait a bit and try again, or upgrade your Gemini billing plan.',
      );
    }

    if (status === 503 || status === 429) {
      await new Promise((r) => setTimeout(r, 1200));
      return fn();
    }

    throw err;
  }
}

/**
 * Prompt shape passed to a provider. `system` sets the assistant's behavior
 * (never echoed by models when passed via the system role/instruction);
 * `user` is the actual turn (data + question, etc.). A bare string is
 * shorthand for `{ user: string }` — no system instruction.
 */
type AiPrompt = string | { system?: string; user: string };

function normalize(prompt: AiPrompt): { system?: string; user: string } {
  return typeof prompt === 'string' ? { user: prompt } : prompt;
}

async function callGemini(prompt: AiPrompt): Promise<string> {
  if (!genAI) throw new Error('gemini not configured');
  const { system, user } = normalize(prompt);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    ...(system ? { systemInstruction: system } : {}),
  });
  const res = await withRetry(() => model.generateContent(user));
  return res.response.text().trim();
}

async function callGroq(prompt: AiPrompt): Promise<string> {
  if (!groqKey) throw new Error('groq not configured');
  const { system, user } = normalize(prompt);
  const messages = system
    ? [
        { role: 'system' as const, content: system },
        { role: 'user' as const, content: user },
      ]
    : [{ role: 'user' as const, content: user }];

  const doOnce = async () => {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const err: any = new Error(
        `groq ${res.status}: ${body.slice(0, 200)}`,
      );
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    return String(data.choices?.[0]?.message?.content ?? '').trim();
  };
  return withRetry(doOnce);
}

/**
 * Try Gemini first, then Groq. Returns the raw text response.
 * Throws only if BOTH providers are unavailable or errored.
 */
async function callTextAi(prompt: AiPrompt): Promise<string> {
  const errors: string[] = [];

  if (genAI) {
    try {
      return await callGemini(prompt);
    } catch (err: any) {
      errors.push(`gemini: ${err?.message ?? String(err)}`);
    }
  }

  if (groqKey) {
    try {
      return await callGroq(prompt);
    } catch (err: any) {
      errors.push(`groq: ${err?.message ?? String(err)}`);
    }
  }

  throw new Error(
    errors.length > 0
      ? `All AI providers failed: ${errors.join(' | ')}`
      : 'No AI providers configured (set GEMINI_API_KEY and/or GROQ_API_KEY)',
  );
}

/* ==========================================================================
 * High-level helpers
 * ========================================================================== */

export type CategorizeInput =
  | string
  | { description: string; amount?: number; type?: 'debit' | 'credit' };

export async function categorizeWithGemini(
  inputs: CategorizeInput[],
): Promise<Category[]> {
  const fallback: Category[] = inputs.map(() => 'Uncategorized');
  if (!isGeminiConfigured() || inputs.length === 0) return fallback;

  const items = inputs.map((x) =>
    typeof x === 'string' ? { description: x } : x,
  );

  const list = CATEGORIES.filter((c) => c !== 'Uncategorized').join(', ');

  const numbered = items
    .map((it, i) => {
      const bits = [it.description];
      if (typeof it.amount === 'number') bits.push(`amount=₹${it.amount}`);
      if (it.type) bits.push(`type=${it.type}`);
      return `${i + 1}. ${bits.join(' · ')}`;
    })
    .join('\n');

  const prompt = `You are an expert transaction categorizer for an Indian personal finance app.
Descriptions come from PhonePe / GPay / UPI / bank statements and often contain
Hinglish merchant names, short forms, or typos.

Categorize each transaction into EXACTLY one of these categories:
${list}

Indian merchant hints (use them to reason, don't blindly memorize):
- "chmest" / "chemist" / "medical" / "pharmacy" / "hospital" / "clinic" → Healthcare
- "kirana" / "general store" / "provisions" / "aata chakki" / "sabzi" / "milk" / "dairy" → Groceries
- "namkeen" / "sweets" / "chaat" / "restaurant" / "dhaba" / "cafe" / "tiffin" / "biryani" / "hotel" / "pizza" / "momos" → Food
- "garments" / "fashion" / "clothing" / "apparel" / "footwear" / "boutique" → Shopping
- "electricals" / "hardware" / "electronics" / "mobile" / "recharge" / "gas cylinder" / "LPG" → Bills
- "petrol" / "fuel" / "auto" / "cab" / "travels" / "railway" / "irctc" / "toll" → Travel
- "school" / "college" / "tuition" / "coaching" / "book" / "stationery" → Education
- "temple" / "religious" / "donation" → Other
- "gaming" / "movie" / "cinema" / "concert" → Entertainment
- "rent" (with big round amount like 5000-50000) → Rent
- "salary" / "payroll" / "stipend" / "wages" → Salary
- Small debit (<₹200) to a person name → often Food (snack / tea / small vendor)
- Large debit (>₹10,000) to a person name with no shop word → likely Rent or Transfer
- Person-to-person credit / "Received from <person>" → Other (a repayment, gift, or split)

Rules:
- Return ONLY a JSON array of category strings — no prose, no code fences.
- Array length MUST equal input length (${items.length}).
- Prefer a specific category over "Other" whenever the merchant name gives ANY hint.
- Use "Other" only when the description is truly a person's name with no shop word AND you have no other signal.

Transactions (${items.length}):
${numbered}`;

  try {
    const text = await callTextAi(prompt);
    const jsonStr = text.replace(/^```(?:json)?\s*|\s*```$/g, '');
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return fallback;
    return items.map((_, i) => {
      const c = parsed[i];
      return (CATEGORIES as readonly string[]).includes(c)
        ? (c as Category)
        : 'Other';
    });
  } catch (err) {
    console.error('[ai] categorize failed:', err);
    return fallback;
  }
}

export async function generateRecommendations(payload: {
  income: number;
  totalExpense: number;
  savingsRate: number;
  topCategories: Array<{ category: string; amount: number }>;
  monthlyTrend?: Array<{ month: string; expense: number }>;
}): Promise<string[]> {
  if (!isGeminiConfigured()) return [];
  const prompt = `You are a friendly Indian personal finance coach.
Given the metrics below, output 3-5 short, specific, actionable recommendations
in plain English. Amounts are in INR (₹). Reference concrete numbers.
Return a JSON array of strings only, no prose.

METRICS:
${JSON.stringify(payload, null, 2)}`;
  try {
    const text = (await callTextAi(prompt))
      .replace(/^```(?:json)?\s*|\s*```$/g, '');
    const arr = JSON.parse(text);
    if (Array.isArray(arr)) {
      return arr.filter((x) => typeof x === 'string').slice(0, 5);
    }
    return [];
  } catch (err) {
    console.error('[ai] recommendations failed:', err);
    return [];
  }
}

/**
 * Some models — llama-3.3 in particular — misbehave with fenced data
 * blocks and paste the DATA back before their actual answer. This scrubs
 * any such echo so the user sees only the model's real reply.
 */
function stripDataEcho(raw: string): string {
  let text = raw.trim();

  // 1. If the model dumped everything up to and including our END marker,
  //    trust the marker and keep only what comes after.
  const endMarker = /---\s*END\s*DATA\s*---/i.exec(text);
  if (endMarker) {
    text = text.slice(endMarker.index + endMarker[0].length).trim();
  }

  // 2. Drop any leading lines that look like data-table content: markers
  //    (=== SECTION ===), transaction rows (2026-08-13 · Category · -₹15 …),
  //    or list bullets that are clearly echoed context, until we hit a real
  //    prose paragraph.
  const isDataLine = (l: string) => {
    const s = l.trim();
    if (!s) return false;
    if (s.startsWith('===') || s.startsWith('---')) return true;
    if (/^\d{4}-\d{2}-\d{2}\s*·/.test(s)) return true; // "2026-08-13 · …"
    if (/^\d{1,2}\s?[ap]m$/i.test(s)) return true; // stray "42 pm"
    if (/^\s+-?\s?₹[\d,]+/.test(l)) return true; // "  ₹100 …"
    if (
      /^\s{2,}[A-Z][A-Za-z ]+:\s+/.test(l) || // "  Food: ₹123"
      /^\s{2,}-\s+[A-Z]/.test(l) // "  - Food: …"
    )
      return true;
    return false;
  };

  const lines = text.split('\n');
  let firstProseIdx = 0;
  while (firstProseIdx < lines.length && isDataLine(lines[firstProseIdx])) {
    firstProseIdx++;
  }
  const cleaned = lines.slice(firstProseIdx).join('\n').trim();
  // If we'd have to strip literally everything, the model produced nothing
  // useful — surface an honest error instead of the raw echo.
  if (cleaned.length === 0) {
    return "I couldn't produce a clean answer for that — please try rephrasing.";
  }
  return cleaned;
}

export async function chatWithData(
  question: string,
  context: string,
): Promise<string> {
  if (!isGeminiConfigured()) {
    return 'AI chat is unavailable — set GEMINI_API_KEY or GROQ_API_KEY in your .env to enable this feature.';
  }

  // System role: behavior + hard constraints. Kept in system so the model
  // isn't tempted to echo the rules themselves.
  const system = `You are a precise personal finance coach for an Indian user. All amounts are in INR (₹).

OUTPUT SHAPE (follow every time):
1) ONE sentence answering the question with a concrete number (compute totals, do not list rows).
2) ONE sentence: a specific, realistic tip on how to reduce spending in that category or improve the metric the question is about. Reference a concrete rupee amount.
3) ONE sentence: the health-score impact of following the tip (e.g. "would lift your savings rate ~2% → +1-2 points on your health score").

HARD RULES:
- DO NOT restate, quote, paraphrase, tabulate, or list the reference data.
- DO NOT include the words "DATA", "BEGIN DATA", "END DATA", "===", or any transaction row from the data block.
- DO NOT invent numbers that aren't in the data.
- If the answer isn't in the data, say so in ONE sentence — no filler.
- Total answer length: 2-4 short sentences.

EXAMPLE:
Question: "How much did I spend on Groceries last month?"
Good answer: "You spent ₹4,180 on Groceries last month across 12 transactions — your #2 category. Switching to a weekly Blinkit list from ad-hoc trips typically saves ~15%, about ₹630/month. That extra saving would raise your savings rate by ~2 percentage points, worth roughly +1 point on your health score."`;

  // User role: question first, then a plainly-labelled reference block.
  const user = `QUESTION: ${question}

Reference (do NOT echo — use it only to compute):
${context}`;

  try {
    const raw = await callTextAi({ system, user });
    return stripDataEcho(raw);
  } catch (err) {
    console.error('[gemini] chat failed:', err);

    if (isGeminiQuotaExceededError(err)) {
      return 'AI chat is temporarily unavailable because the Gemini free-tier quota has been reached. Please try again later or upgrade your Gemini plan.';
    }

    return 'Sorry, I could not answer that right now. Please try again.';
  }
}
