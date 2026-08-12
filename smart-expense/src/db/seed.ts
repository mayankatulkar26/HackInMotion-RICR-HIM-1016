/**
 * Optional seed — creates a demo user with realistic Indian transactions
 * so the dashboard renders without going through CSV import.
 *
 * Run:  npm run db:seed
 * User: demo@smartexpense.dev  /  demo1234
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDb } from './index';
import { User, Transaction, Budget } from './models';
import { ruleBasedCategorize, extractMerchantKey } from '../lib/categorizer';
import { dedupeHash } from '../lib/csv';

const DEMO_EMAIL = 'demo@smartexpense.dev';
const DEMO_PASSWORD = 'demo1234';

const DEMO_TX = [
  ['Salary Credit - TechCorp', 65000, 'credit'],
  ['Swiggy Order Dinner', 450, 'debit'],
  ['Rent Transfer to Landlord', 18000, 'debit'],
  ['Netflix Subscription', 649, 'debit'],
  ['BigBasket Groceries', 1850, 'debit'],
  ['Uber Trip Home', 890, 'debit'],
  ['Amazon Headphones', 2499, 'debit'],
  ['Spotify Premium', 119, 'debit'],
  ['BSES Electricity Bill', 1420, 'debit'],
  ['Zomato Lunch', 610, 'debit'],
  ['Zerodha SIP', 5000, 'debit'],
  ['Airtel Recharge', 499, 'debit'],
  ['Myntra Purchase', 3200, 'debit'],
  ['Apollo Pharmacy', 540, 'debit'],
] as const;

async function main() {
  await connectDb();

  const existing = await User.findOne({ email: DEMO_EMAIL });
  if (existing) {
    console.log('Demo user already exists — skipping.');
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await User.create({
    email: DEMO_EMAIL,
    name: 'Demo User',
    passwordHash,
  });
  console.log('Created demo user:', DEMO_EMAIL);

  const now = new Date();
  const rows = DEMO_TX.map(([desc, amt, type], i) => {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    return {
      userId: user._id,
      amount: amt as number,
      description: desc as string,
      type: type as 'debit' | 'credit',
      date,
      category:
        ruleBasedCategorize(desc as string) ??
        (type === 'credit' ? 'Salary' : 'Uncategorized'),
      merchantName: extractMerchantKey(desc as string),
      dedupeHash: dedupeHash({
        amount: amt as number,
        date,
        description: desc as string,
      }),
    };
  });
  await Transaction.insertMany(rows);
  console.log(`Seeded ${rows.length} transactions`);

  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  await Budget.insertMany([
    { userId: user._id, category: 'Food', monthlyLimit: 8000, month },
    { userId: user._id, category: 'Groceries', monthlyLimit: 6000, month },
    { userId: user._id, category: 'Subscriptions', monthlyLimit: 1500, month },
    { userId: user._id, category: 'Shopping', monthlyLimit: 5000, month },
  ]);
  console.log('Seeded 4 budgets for', month);

  console.log('\nDone! Log in with:');
  console.log(`  ${DEMO_EMAIL}  /  ${DEMO_PASSWORD}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
