import type { Category } from './categories';

/**
 * Layer 1: Rule-based categorizer using ~60 keyword patterns for Indian merchants.
 * Fast, free, and handles ~80% of common cases before we spend a Gemini call.
 */
const RULES: Array<{ keywords: string[]; category: Category }> = [
  // Food delivery / restaurants
  {
    category: 'Food',
    keywords: [
      'swiggy', 'zomato', 'ubereats', 'dominos', 'pizza hut', 'kfc',
      'mcdonald', 'burger king', 'subway', 'starbucks', 'cafe', 'restaurant',
      'dhaba', 'biryani', 'foodpanda', 'freshmenu', 'faasos',
    ],
  },
  // Groceries
  {
    category: 'Groceries',
    keywords: [
      'bigbasket', 'blinkit', 'zepto', 'grofers', 'dmart', 'reliance fresh',
      'more supermarket', 'spencers', 'natures basket', 'instamart',
      'jiomart', 'kirana',
    ],
  },
  // Subscriptions / streaming / SaaS
  {
    category: 'Subscriptions',
    keywords: [
      'netflix', 'spotify', 'hotstar', 'prime video', 'amazon prime',
      'youtube premium', 'apple music', 'sony liv', 'zee5', 'jio saavn',
      'wynk', 'gaana', 'adobe', 'notion', 'figma', 'github', 'openai',
      'chatgpt', 'linkedin premium', 'canva', 'dropbox',
    ],
  },
  // Travel / transport
  {
    category: 'Travel',
    keywords: [
      'uber', 'ola', 'rapido', 'metro', 'irctc', 'indigo', 'spicejet',
      'vistara', 'air india', 'goair', 'makemytrip', 'goibibo', 'yatra',
      'oyo', 'airbnb', 'redbus', 'petrol', 'fuel', 'hp petrol',
      'iocl', 'bpcl', 'shell',
    ],
  },
  // Shopping
  {
    category: 'Shopping',
    keywords: [
      'amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho', 'snapdeal',
      'tata cliq', 'shoppers stop', 'lifestyle', 'westside', 'zara',
      'h&m', 'uniqlo', 'decathlon', 'croma', 'reliance digital',
    ],
  },
  // Bills / utilities
  {
    category: 'Bills',
    keywords: [
      'electricity', 'bses', 'tata power', 'adani electricity', 'msedcl',
      'water bill', 'gas bill', 'airtel', 'jio', 'vodafone', 'vi ', 'bsnl',
      'act fibernet', 'excitel', 'broadband', 'wifi', 'postpaid', 'recharge',
      'dth', 'tata sky',
    ],
  },
  // Entertainment
  {
    category: 'Entertainment',
    keywords: [
      'bookmyshow', 'pvr', 'inox', 'cinepolis', 'movie', 'concert',
      'gaming', 'steam', 'playstation', 'xbox', 'nintendo', 'paytm insider',
    ],
  },
  // Healthcare
  {
    category: 'Healthcare',
    keywords: [
      'apollo', 'pharmeasy', 'netmeds', '1mg', 'medlife', 'practo',
      'hospital', 'clinic', 'pharmacy', 'medplus', 'thyrocare',
      'diagnostic', 'lab test',
    ],
  },
  // Education
  {
    category: 'Education',
    keywords: [
      'byju', 'unacademy', 'udemy', 'coursera', 'edx', 'upgrad',
      'vedantu', 'toppr', 'school fee', 'tuition', 'college fee',
      'university', 'course',
    ],
  },
  // Rent
  {
    category: 'Rent',
    keywords: ['rent', 'house rent', 'rent transfer', 'landlord', 'nobroker'],
  },
  // Salary / income
  {
    category: 'Salary',
    keywords: [
      'salary', 'sal cr', 'salary credit', 'sal-', 'payroll', 'stipend',
    ],
  },
  // Investment
  {
    category: 'Investment',
    keywords: [
      'zerodha', 'groww', 'upstox', 'kuvera', 'coin', 'mutual fund',
      'sip ', 'nps', 'ppf', 'fd renewal', 'stock', 'equity', 'coin dcx',
      'wazirx', 'binance',
    ],
  },
  // Transfer — system-level protocol names only.
  // "sent to X" / "received from X" are too ambiguous (usually P2P with a
  // friend or vendor, not an internal move); we let those flow through to
  // Uncategorized so they count as real income/expense.
  {
    category: 'Transfer',
    keywords: ['imps', 'neft', 'rtgs', 'p2p transfer', 'own account'],
  },
];

/**
 * Rule-based categorization. Returns null if no keyword matches.
 * Longer/more-specific keywords win over generic ones (rough heuristic:
 * we iterate rules top-to-bottom and pick the first match, which is why
 * generic 'Transfer' sits last).
 */
export function ruleBasedCategorize(text: string): Category | null {
  const norm = text.toLowerCase();
  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (norm.includes(kw)) return rule.category;
    }
  }
  return null;
}

/**
 * Best-effort merchant extraction: pull the first meaningful word/phrase from
 * the transaction description. Used as a cache key so we don't send the same
 * merchant to Gemini twice.
 */
export function extractMerchantKey(description: string): string {
  const cleaned = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(order|payment|txn|ref|no|inr|rs|to|from|via|upi|imps|neft)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const parts = cleaned.split(' ').filter(Boolean);
  return parts.slice(0, 3).join(' ') || cleaned || description.toLowerCase();
}
