import { GoogleGenerativeAI } from '@google/generative-ai';
import { CATEGORIES, type Category } from './categories';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Google decommissioned the numbered aliases (gemini-1.5-flash / 2.0-flash /
// 2.5-flash) for new API keys — they all 404. `gemini-flash-latest` is the
// rolling alias to whatever's currently GA and stays working long-term.
// Override with GEMINI_MODEL in .env if you have access to a specific version.
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

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

export function isGeminiConfigured(): boolean {
  return Boolean(genAI);
}

export type CategorizeInput =
  | string
  | { description: string; amount?: number; type?: 'debit' | 'credit' };

/**
 * Batch-categorize up to 20 transactions in one Gemini call.
 *
 * Inputs may be plain description strings or richer `{description, amount,
 * type}` objects — the richer form lets the model use amount magnitude and
 * debit/credit direction as signals (₹15 debit to a "namkeen" shop is Food;
 * ₹18,000 debit labelled "rent transfer" is Rent).
 *
 * Guarantees: the returned array has the same length as `inputs`. On any
 * error (no key, quota, network) every slot gets 'Uncategorized', so the
 * caller can keep the row rather than failing the whole import.
 */
export async function categorizeWithGemini(
  inputs: CategorizeInput[],
): Promise<Category[]> {
  const fallback: Category[] = inputs.map(() => 'Uncategorized');
  if (!genAI || inputs.length === 0) return fallback;

  // Normalize to objects
  const items = inputs.map((x) =>
    typeof x === 'string' ? { description: x } : x,
  );

  const model = genAI.getGenerativeModel({ model: MODEL });
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
- "electricals" / "hardware" / "electronics" / "mobile" / "recharge" → Bills
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
    const res = await callWithRetry(() => model.generateContent(prompt));
    const text = res.response.text().trim();
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
    console.error('[gemini] categorize failed:', err);
    return fallback;
  }
}

/**
 * Produce 3-5 short, specific recommendations from computed metrics.
 * Returns [] on any failure so the UI can gracefully hide the card.
 */
export async function generateRecommendations(payload: {
  income: number;
  totalExpense: number;
  savingsRate: number;
  topCategories: Array<{ category: string; amount: number }>;
  monthlyTrend?: Array<{ month: string; expense: number }>;
}): Promise<string[]> {
  if (!genAI) return [];
  const model = genAI.getGenerativeModel({ model: MODEL });
  const prompt = `You are a friendly Indian personal finance coach.
Given the metrics below, output 3-5 short, specific, actionable recommendations
in plain English. Amounts are in INR (₹). Reference concrete numbers.
Return a JSON array of strings only, no prose.

METRICS:
${JSON.stringify(payload, null, 2)}`;
  try {
    const res = await callWithRetry(() => model.generateContent(prompt));
    const text = res.response.text().trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
    const arr = JSON.parse(text);
    if (Array.isArray(arr)) return arr.filter((x) => typeof x === 'string').slice(0, 5);
    return [];
  } catch (err) {
    console.error('[gemini] recommendations failed:', err);
    return [];
  }
}

/**
 * Chat: answer a user question grounded in provided context (their data).
 */
export async function chatWithData(
  question: string,
  context: string,
): Promise<string> {
  if (!genAI) {
    return "AI chat is unavailable — set GEMINI_API_KEY to enable this feature.";
  }
  const model = genAI.getGenerativeModel({ model: MODEL });
  const prompt = `You are a helpful personal finance assistant for an Indian user.
Answer the question using ONLY the DATA below. Amounts are in INR (₹).
If the data doesn't contain the answer, say so honestly.
Keep the answer short (2-4 sentences).

DATA:
${context}

QUESTION: ${question}`;
  try {
    const res = await callWithRetry(() => model.generateContent(prompt));
    return res.response.text().trim();
  } catch (err) {
    console.error('[gemini] chat failed:', err);

    if (isGeminiQuotaExceededError(err)) {
      return 'AI chat is temporarily unavailable because the Gemini free-tier quota has been reached. Please try again later or upgrade your Gemini plan.';
    }

    return 'Sorry, I could not answer that right now. Please try again.';
  }
}
