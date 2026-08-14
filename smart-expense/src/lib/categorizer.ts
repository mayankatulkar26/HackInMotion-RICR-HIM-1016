import type { Category } from './categories';

/**
 * Layer 1: Rule-based categorizer using ~200 keyword patterns for Indian
 * merchants and household items.
 *
 * Fast, free, and handles most common cases before we spend a Gemini call.
 * Rules are checked top-to-bottom, first match wins — so more specific
 * patterns must appear before generic ones (e.g. "ice cream" (Food) comes
 * before "milk" (Groceries) or an Amul Ice Cream Parlour would get tagged
 * Groceries).
 */
const RULES: Array<{ keywords: string[]; category: Category }> = [
  // ----- Food (specific / brands / meal terms) -----
  {
    category: 'Food',
    keywords: [
      // Delivery / big food chains
      'swiggy', 'zomato', 'ubereats', 'dominos', 'pizza hut', 'kfc',
      'mcdonald', 'burger king', 'subway', 'starbucks', 'costa coffee',
      'ccd', 'cafe coffee day', 'barista', 'chai point', 'chaayos',
      'faasos', 'freshmenu', 'foodpanda', 'behrouz', 'ovenstory',
      // Cuisine / meal words
      'restaurant', 'cafe', 'dhaba', 'hotel ', 'biryani', 'pizza',
      'burger', 'sandwich', 'kebab', 'tandoor', 'thali', 'tiffin',
      'shawarma', 'rolls', 'wraps', 'momos', 'noodles', 'chinese',
      'punjabi', 'south indian', 'north indian', 'chaat', 'panipuri',
      'gol gappa', 'gol gappe', 'dosa', 'idli', 'vada', 'paratha',
      'kachori', 'samosa', 'namkeen', 'sweets', 'mithai', 'halwa',
      'ice cream', 'ice-cream', 'icecream', 'dessert', 'pastry',
      'bakery', 'cake shop', 'confectionery',
      // Beverages
      'tea stall', 'chai wala', 'chai walla', 'juice', 'juice corner',
      'lassi', 'coffee shop', 'coffee house',
      // Non-veg specialty
      'chicken', 'mutton', 'fish shop', 'meat shop', 'seafood',
      'kababs', 'grill', 'bbq',
      // Delivery / catering
      'catering', 'eatery', 'foods', 'restro', 'kitchen',
      // Bars / drinks
      'brewery', 'bar & ', 'liquor',
    ],
  },
  // ----- Groceries (specific / brands) -----
  {
    category: 'Groceries',
    keywords: [
      // Big brands
      'bigbasket', 'blinkit', 'zepto', 'grofers', 'dmart', 'reliance fresh',
      'more supermarket', 'more retail', 'spencers', 'natures basket',
      'instamart', 'jiomart', 'star bazaar', 'ratnadeep',
      // Traditional / small
      'kirana', 'general store', 'provision', 'provisions', 'super market',
      'supermarket', 'super mart', 'mart ', 'bazaar', 'grocers',
      // Fresh
      'sabzi', 'sabji', 'vegetable', 'vegetables', 'veggies', 'fruit',
      'fruits', 'fruit shop', 'mandi',
      // Dairy
      'milk', 'dairy', 'paneer', 'curd', 'ghee', 'butter',
      'amul', 'mother dairy', 'nestle dairy',
      // Staples
      'atta', 'aata', 'chakki', 'ration', 'rice ', 'dal ', 'pulses',
      'oil ', 'masala',
      // Meat/fish/egg for cooking (goes to Groceries as raw)
      'chicken shop', 'egg shop', 'butcher',
    ],
  },
  // ----- Subscriptions -----
  {
    category: 'Subscriptions',
    keywords: [
      // Streaming / video
      'netflix', 'prime video', 'amazon prime', 'hotstar', 'disney+ hotstar',
      'disney+', 'jio cinema', 'sonyliv', 'sony liv', 'zee5', 'aha',
      'mubi', 'lionsgate', 'apple tv', 'crunchyroll',
      // Music
      'spotify', 'apple music', 'youtube premium', 'youtube music',
      'jio saavn', 'jiosaavn', 'gaana', 'wynk', 'resso',
      // Books / learning
      'kindle', 'audible',
      // SaaS / productivity
      'adobe', 'notion', 'figma', 'github', 'openai', 'chatgpt',
      'anthropic', 'claude ', 'linkedin premium', 'canva',
      'dropbox', 'microsoft 365', 'office 365', 'google one',
      'icloud', 'onedrive', 'quora+',
    ],
  },
  // ----- Travel / transport / fuel -----
  {
    category: 'Travel',
    keywords: [
      // Cabs / autos
      'uber', 'ola', 'rapido', 'jugnoo', 'meru', 'blusmart',
      // Public transit
      'metro', 'bmrcl', 'dmrc', 'mmrda', 'namma metro', 'kmrl',
      'irctc', 'railway', 'indian railway',
      // Flights
      'indigo', 'spicejet', 'vistara', 'air india', 'goair', 'go air',
      'akasa', 'airasia',
      // Booking sites
      'makemytrip', 'goibibo', 'yatra', 'cleartrip', 'ixigo', 'easemytrip',
      'redbus', 'abhibus',
      // Hotels
      'oyo', 'airbnb', 'treebo', 'fabhotel', 'lemontree', 'taj hotel',
      // Fuel
      'petrol', 'diesel', 'fuel', 'hp petrol', 'iocl', 'bpcl', 'shell ',
      'reliance petrol', 'ioc ', 'nayara',
      // Road
      'fasttag', 'fast tag', 'fastag', 'toll ', 'parking',
    ],
  },
  // ----- Shopping (electronics, fashion, home) -----
  {
    category: 'Shopping',
    keywords: [
      // Marketplaces
      'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'snapdeal',
      'tata cliq', 'nykaa', 'nykaa fashion', 'jiomart fashion',
      // Fashion / apparel
      'shoppers stop', 'lifestyle', 'westside', 'zara', 'h&m',
      'uniqlo', 'levis', 'levi ', 'peter england', 'louis philippe',
      'allen solly', 'raymond', 'fbb', 'pantaloons', 'reliance trends',
      'max fashion', 'garments', 'apparel', 'fashion store', 'boutique',
      // Footwear
      'bata', 'liberty', 'metro shoes', 'campus shoes', 'skechers',
      'puma', 'nike', 'adidas', 'reebok', 'crocs',
      // Sports / outdoor
      'decathlon',
      // Electronics
      'croma', 'reliance digital', 'vijay sales', 'lot mobiles',
      'sangeetha', 'poorvika',
      // Home & furniture
      'home centre', 'home center', 'pepperfry', 'urban ladder',
      'ikea', 'godrej interio', 'nilkamal', 'wakefit', 'sleepwell',
      'furniture', 'home decor', 'kitchenware', 'appliance ',
      // Kids / stationery
      'toy', 'toys', 'firstcry', 'hopscotch', 'stationery',
      // Personal care / cosmetics
      'nykaa beauty', 'purplle', 'lakme', 'maybelline',
      'salon', 'spa ', 'parlour', 'parlor', 'barber', 'hair studio',
      'gym', 'yoga', 'fitness', 'cult fit', 'cure fit', 'cultfit',
      'urban company', 'urbanclap',
      // Jewellery
      'tanishq', 'kalyan jewellers', 'malabar gold', 'joyalukkas',
    ],
  },
  // ----- Bills / utilities / recharges -----
  {
    category: 'Bills',
    keywords: [
      // Cooking gas / LPG
      'gas cylinder', 'lpg', 'lpg refill', 'gas booking', 'gas refill',
      'indane', 'indane gas', 'hp gas', 'bharat gas', 'cooking gas',
      // Electricity
      'electricity', 'electric bill', 'bses', 'tata power', 'adani electricity',
      'msedcl', 'mahavitaran', 'bescom', 'kseb', 'apspdcl', 'wbsedcl',
      // Water / society
      'water bill', 'water tanker', 'jal board',
      'society maintenance', 'maintenance charges', 'rwa', 'apartment ',
      'housing society',
      // Telecom / broadband
      'airtel', 'jio ', 'vodafone', 'vi ', 'bsnl', 'mtnl',
      'act fibernet', 'act broadband', 'excitel', 'hathway',
      'broadband', 'wifi', 'internet bill', 'postpaid', 'prepaid',
      'recharge', 'mobile recharge', 'dth', 'tata sky', 'tata play',
      'dish tv', 'airtel dth', 'd2h',
      // Wallets used to pay bills
      'freecharge', 'mobikwik', 'paytm bill',
      // Insurance premiums (utility-like)
      'insurance premium', 'policy premium',
      // Domestic help / cleaning / garbage
      'maid', 'house help', 'cook ', 'garbage', 'sanitation', 'plumber',
      'electrician', 'carpenter',
    ],
  },
  // ----- Entertainment (out-of-home / gaming) -----
  {
    category: 'Entertainment',
    keywords: [
      'bookmyshow', 'pvr', 'inox', 'cinepolis', 'carnival cinemas',
      'movie', 'cinema', 'theatre', 'theater', 'concert', 'event ',
      'paytm insider', 'district', 'ticketgenie',
      'gaming', 'steam', 'playstation', 'psn ', 'xbox', 'nintendo',
      'esports', 'roblox', 'fortnite',
      'amusement', 'water park', 'zoo ', 'aquarium', 'museum ',
    ],
  },
  // ----- Healthcare / pharmacies -----
  {
    category: 'Healthcare',
    keywords: [
      // Pharma
      'apollo pharmacy', 'apollo 24', 'pharmeasy', 'netmeds', '1mg',
      'medlife', 'medplus', 'wellness pharmacy', 'medlife',
      'pharmacy', 'chemist', 'chmest', 'medical store', 'medicals ',
      'druggist',
      // Hospitals / clinics
      'apollo hospital', 'fortis', 'max hospital', 'manipal hospital',
      'medanta', 'aiims', 'kokilaben', 'lilavati', 'columbia asia',
      'hospital', 'clinic', 'nursing home', 'polyclinic',
      // Doctors / specialists
      'doctor', 'dr.', 'physician', 'dentist', 'orthodontic', 'dental',
      'physio', 'physiotherapy', 'ayurved', 'homeopath',
      // Diagnostics / labs
      'diagnostic', 'lab test', 'thyrocare', 'dr lal', 'metropolis',
      'srl diagnostics', 'path lab', 'pathology', 'blood test',
      'x-ray', 'mri ', 'ct scan', 'ultrasound',
      // Consult / telemed
      'practo', 'tata 1mg', 'medibuddy',
      // Vaccines / vet / ambulance
      'vaccine', 'vaccination', 'ambulance',
      // Wellness / ayurvedic
      'patanjali', 'baba ramdev', 'himalaya wellness', 'kapiva',
      // Optical
      'lenskart', 'titan eyeplus', 'himalaya optical',
    ],
  },
  // ----- Education -----
  {
    category: 'Education',
    keywords: [
      'byju', 'unacademy', 'udemy', 'coursera', 'edx', 'upgrad', 'skillshare',
      'vedantu', 'toppr', 'physics wallah', 'pw ', 'aakash',
      'school fee', 'tuition', 'coaching', 'college fee', 'college',
      'university', 'course fee', 'exam fee', 'library',
      'textbook', 'book store', 'bookstore', 'stationery shop',
      'akash institute', 'allen career', 'fiitjee',
    ],
  },
  // ----- Rent -----
  {
    category: 'Rent',
    keywords: [
      'rent', 'house rent', 'monthly rent', 'rent transfer', 'rent payment',
      'landlord', 'nobroker rent', 'nestaway', 'zolostays',
    ],
  },
  // ----- Salary -----
  {
    category: 'Salary',
    keywords: [
      'salary', 'sal cr', 'salary credit', 'sal-', 'sal ', 'payroll',
      'stipend', 'wages', 'monthly salary', 'net salary',
    ],
  },
  // ----- Investment -----
  {
    category: 'Investment',
    keywords: [
      // Brokerages
      'zerodha', 'groww', 'upstox', 'kuvera', 'coin', 'angel one',
      'angelone', 'sharekhan', 'motilal oswal', '5paisa', 'iifl ',
      // Instruments
      'mutual fund', 'sip ', 'nps ', 'ppf ', 'elss ', 'sukanya',
      'fd renewal', 'fd booking', 'rd ', 'stock', 'equity',
      // Crypto
      'coin dcx', 'coindcx', 'wazirx', 'binance', 'coinswitch',
      // Insurance investment
      'lic ', 'lic india', 'hdfc life', 'icici pru', 'kotak life',
      'max life', 'tata aia', 'sbi life', 'insurance', 'policy premium',
    ],
  },
  // ----- Transfer (system-level protocols only) -----
  {
    category: 'Transfer',
    keywords: ['imps', 'neft', 'rtgs', 'p2p transfer', 'own account'],
  },
  // ----- Other (charity / religious) -----
  {
    category: 'Other',
    keywords: [
      'temple', 'donation', 'dharma', 'ngo', 'charity',
      'gurudwara', 'church', 'mosque', 'trust ',
    ],
  },
];

/**
 * Rule-based categorization. Returns null if no keyword matches.
 * Longer/more-specific keywords win over generic ones (rough heuristic:
 * we iterate rules top-to-bottom and pick the first match, which is why
 * generic 'Transfer' sits near the end).
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
 * Deterministic fallback that runs AFTER rules and AI have both failed.
 * Guarantees a real category (never returns 'Uncategorized' or null) using
 * a wider set of description hints + amount magnitude + type.
 *
 * The intent is: no imported row should ever sit as 'Uncategorized' in the
 * DB. If we truly can't tell, we return 'Other' — honest ("we don't know")
 * without silently hiding the row from the totals.
 */
export function smartFallback(
  description: string,
  amount: number,
  type: 'debit' | 'credit',
): Category {
  const s = description.toLowerCase();

  // ---- Credit-side guesses ----
  if (type === 'credit') {
    if (/\b(salary|payroll|stipend|wages|salary credit|sal cr)\b/.test(s)) {
      return 'Salary';
    }
    if (/\b(refund|reversal|cashback|chargeback)\b/.test(s)) return 'Other';
    if (/\b(dividend|interest credit|maturity|redemption|coupon)\b/.test(s)) {
      return 'Investment';
    }
    // P2P received / gift / repayment / income — hard to guess without name
    return 'Other';
  }

  // ---- Debit-side merchant-word hints ----

  // Household / groceries
  if (/\b(store|mart|super|kirana|provision|sabzi|sabji|dairy|milk|vegetable|veggie|fruit|bakery|chakki|aata|atta|dal |rice |paneer|curd|ghee|mandi|grocer|ration)\b/.test(s)) {
    return 'Groceries';
  }

  // Food / drinks
  if (/\b(hotel|restaurant|dhaba|cafe|tiffin|biryani|pizza|momos|chaat|namkeen|sweets|snacks|tea|coffee|bar|pub|kitchen|foods|eatery|thali|meal|kebab|tandoor|dosa|idli|paratha|kachori|samosa|halwa|dessert|ice cream|shake|lassi|juice|chicken shop|mutton|meat shop|seafood|fish shop|catering|restro)\b/.test(s)) {
    return 'Food';
  }

  // Healthcare
  if (/\b(chemist|chmest|medical|pharmacy|hospital|clinic|doctor|dentist|physio|apollo|dental|diagnostic|health|nursing home|polyclinic|ayurved|homeopath|patanjali|himalaya|vaccine|ambulance|lab test|pathology|thyrocare|1mg|netmeds|medplus|lenskart|optical)\b/.test(s)) {
    return 'Healthcare';
  }

  // Bills / utilities / household services (gas cylinder, maid, water etc.)
  if (/\b(gas cylinder|lpg|indane|hp gas|bharat gas|cooking gas|electricity|electric bill|bses|tata power|adani|msedcl|bescom|kseb|water bill|water tanker|jal board|society maintenance|maintenance charge|rwa|apartment|housing society|airtel|jio |vodafone|vi |bsnl|mtnl|act fibernet|excitel|hathway|broadband|wifi|internet bill|postpaid|prepaid|recharge|mobile recharge|dth|tata sky|tata play|dish tv|freecharge|mobikwik|maid|house help|cook |garbage|sanitation|plumber|electrician|carpenter|hardware|electrical)\b/.test(s)) {
    return 'Bills';
  }

  // Shopping / fashion / home / personal care
  if (/\b(fashion|garment|apparel|clothing|footwear|boutique|jewellers|jewellery|watches|salon|spa|parlour|parlor|barber|beauty|cosmetic|makeup|skincare|hair studio|gym|yoga|fitness|urban company|urbanclap|home centre|home center|pepperfry|urban ladder|ikea|furniture|home decor|kitchenware|appliance|toy|toys|firstcry|amazon|flipkart|myntra|ajio|nykaa|meesho|croma|reliance digital|shoppers stop|lifestyle|westside|zara|uniqlo|bata|liberty|decathlon|puma|nike|adidas)\b/.test(s)) {
    return 'Shopping';
  }

  // Travel
  if (/\b(petrol|diesel|fuel|gas station|toll|parking|fasttag|fastag|cab|auto|taxi|travels|railway|irctc|bus |metro|ticket|airline|flight|uber|ola|rapido|indigo|spicejet|vistara|air india|makemytrip|goibibo|yatra|cleartrip|redbus|abhibus|oyo|airbnb|treebo)\b/.test(s)) {
    return 'Travel';
  }

  // Education
  if (/\b(school|college|tuition|coaching|book|stationery|course|class |academy|library|byju|unacademy|udemy|coursera|edx|vedantu|toppr|physics wallah|aakash|fiitjee)\b/.test(s)) {
    return 'Education';
  }

  // Entertainment
  if (/\b(cinema|movie|concert|game|gaming|entertainment|park|theatre|theater|bookmyshow|pvr|inox|cinepolis|steam|playstation|xbox)\b/.test(s)) {
    return 'Entertainment';
  }

  // Rent
  if (/\brent\b/.test(s)) return 'Rent';

  // Investments
  if (/\b(sip|mutual fund|equity|stock|zerodha|groww|upstox|coin|nps|ppf|elss|sukanya|lic |insurance|policy premium|kotak life|icici pru|max life|tata aia|sbi life|hdfc life|dividend|maturity|redemption|fd |rd )\b/.test(s)) {
    return 'Investment';
  }

  // ---- Amount-band heuristics (only when description gave nothing) ----
  if (amount >= 15_000 && amount <= 60_000) return 'Rent'; // typical rent band
  if (amount < 100) return 'Food'; // tiny debits — almost always snacks/tea
  if (amount >= 20_000) return 'Shopping'; // large one-off buys

  return 'Other';
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
