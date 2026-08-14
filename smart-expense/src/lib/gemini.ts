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

/**
 * Batch-categorize up to 20 transaction descriptions in one Gemini call.
 * Returns an array of categories aligned to input order. Falls back to
 * 'Other' for any item Gemini can't classify.
 *
 * Guarantees: the returned array has the same length as `descriptions`.
 * On any error (no key, quota, network), returns 'Uncategorized' for every
 * item — the caller layers this behind the rule-based categorizer, so a
 * silent Gemini failure just means fewer auto-labels, not broken import.
 */
export async function categorizeWithGemini(
  descriptions: string[],
): Promise<Category[]> {
  const fallback: Category[] = descriptions.map(() => 'Uncategorized');
  if (!genAI || descriptions.length === 0) return fallback;

  const model = genAI.getGenerativeModel({ model: MODEL });
  const list = CATEGORIES.filter((c) => c !== 'Uncategorized').join(', ');

  const prompt = `You are a strict transaction categorizer for an Indian personal finance app.
Categorize each transaction description into EXACTLY one of these categories:
${list}

Rules:
- Return ONLY a JSON array of category strings, no prose, no code fences.
- Array length MUST equal input length.
- Use "Other" if genuinely unclear.

Descriptions (${descriptions.length}):
${descriptions.map((d, i) => `${i + 1}. ${d}`).join('\n')}`;

  try {
    const res = await callWithRetry(() => model.generateContent(prompt));
    const text = res.response.text().trim();
    const jsonStr = text.replace(/^```(?:json)?\s*|\s*```$/g, '');
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return fallback;
    return descriptions.map((_, i) => {
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
