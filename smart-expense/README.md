# Wealth Sight — Financial Health Dashboard

AI-powered personal finance web app for Hack In Motion (FinTech theme). Upload a bank statement, get auto-categorized transactions, a financial health score, and personalized recommendations.

**Status:** Day 1 complete — auth, DB, transactions (manual + CSV), rule-based + Gemini categorization, budgets, goals, dashboard shell. Day 2 layers on real charts, health-score formula, AI insights, and chat.

## Quick start

```bash
cd smart-expense
npm install
cp .env.example .env
# generate an auth secret:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# paste into AUTH_SECRET in .env
```

Initialize the local database (creates `local.db` in the project root):

```bash
npm run db:push
```

Optional — seed a demo user with 14 realistic transactions and 4 budgets:

```bash
npm run db:seed
# then log in with demo@smartexpense.dev / demo1234
```

Run the dev server:

```bash
npm run dev
```

Open http://localhost:3000

## Environment variables

| Var | Required | Notes |
|-----|----------|-------|
| `AUTH_SECRET` | ✅ | any random string (32+ bytes). |
| `AUTH_URL` | dev only | usually `http://localhost:3000` |
| `DATABASE_URL` | ✅ | defaults to `file:./local.db`. For prod, use a Turso URL (`libsql://…`). |
| `DATABASE_AUTH_TOKEN` | prod only | Turso token. |
| `GEMINI_API_KEY` | optional | free at https://aistudio.google.com/apikey — categorization falls back to rules if absent. |

## Categorization approach — hybrid, in that order

1. **Rule-based** (`src/lib/categorizer.ts`) — 60+ keyword patterns for Indian merchants (Swiggy, Zomato, BigBasket, Netflix, Uber, Ola, Amazon, BSES, Airtel, Zerodha, PVR, Apollo, and more) grouped into 12 categories. Runs instantly, zero cost, handles ~80% of typical statements.
2. **Merchant cache** — for anything the rules miss, we check a per-merchant cache in the DB first so the same shop never hits the Gemini API twice.
3. **Gemini** (`src/lib/gemini.ts`) — remaining descriptions are batched in groups of 20 into a single `gemini-1.5-flash` call. On failure (no key, quota, network), transactions gracefully stay as "Uncategorized" — the import never breaks.

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router + Server Actions) |
| Auth | NextAuth v5 (credentials + bcrypt) |
| DB | SQLite via libsql / Turso |
| ORM | Drizzle |
| AI | Google Gemini `gemini-1.5-flash` |
| UI | Tailwind + shadcn-style Radix primitives |
| Animation | framer-motion |
| Charts | Recharts (arriving Day 2) |
| CSV | papaparse |

### Why libsql instead of MySQL?

The plan called for MySQL. We use libsql (SQLite protocol) because:
- **Zero setup for local dev** — a file is created on first run.
- **Vercel-compatible for prod** — Turso is a free-tier libsql host that works serverlessly (MySQL on Vercel needs a paid connection pool).
- **Same Drizzle schema** — swap to MySQL by changing `drizzle-orm/libsql` → `drizzle-orm/mysql2` and the schema `sqliteTable` → `mysqlTable`. Everything else stays.

## Project structure

```
src/
├── app/
│   ├── (auth)/{login,signup}       — animated split-screen auth pages
│   ├── (dashboard)/
│   │   ├── dashboard               — overview, KPIs, health gauge
│   │   ├── transactions            — manual + CSV + list
│   │   ├── budgets                 — monthly limits + savings goals
│   │   ├── insights                — Day 2
│   │   └── chat                    — Day 2
│   └── api/auth/[...nextauth]      — NextAuth handler
├── actions/                        — server actions (transactions, budgets, auth)
├── components/
│   ├── ui/                         — Button, Card, Dialog, Select, … (shadcn-style)
│   ├── auth/                       — login/signup forms
│   ├── charts/                     — HealthGauge (canvas-free SVG, animated)
│   ├── dashboard/                  — KPI, EmptyState, RecentTransactions
│   ├── transactions/               — manual form, CSV uploader w/ preview, table
│   └── budgets/                    — budget & goal forms + lists
├── db/                             — Drizzle schema + connection + seed
└── lib/
    ├── auth.ts                     — NextAuth config
    ├── categories.ts               — 15 categories + visual tokens
    ├── categorizer.ts              — rule-based classifier
    ├── gemini.ts                   — Gemini wrapper (categorize / recommend / chat)
    ├── csv.ts                      — Papa parse + date normalization + dedupe hash
    └── utils.ts                    — cn(), formatCurrency, monthKey
```

## What's in Day 1

- [x] Next.js 15 + Drizzle + libsql setup
- [x] Full schema (users, accounts, transactions, budgets, goals, snapshots, merchant cache)
- [x] NextAuth v5 with credentials + bcrypt password hashing
- [x] Middleware protecting all routes except /, /login, /signup
- [x] Server actions: transaction CRUD, CSV import with dedupe + rule/AI cascade
- [x] CSV parsing with 3 date-format detection, negative-amount handling, missing-field defaults, and a preview step before import
- [x] Rule-based categorizer (60+ keywords, 12 categories)
- [x] Gemini integration (batched, cached, graceful fallback)
- [x] Budget & savings goal CRUD server actions
- [x] Landing page with aurora background, animated hero, feature grid
- [x] Split-screen login/signup with password toggle
- [x] Dashboard shell (sidebar with animated active state, topbar, empty states)
- [x] Transactions page with tabbed manual/CSV, filtered/searchable table
- [x] Budgets page with color-coded progress bars (green / yellow / red)
- [x] Savings goals with live progress
- [x] Recent transactions list with per-category color tokens
- [x] Animated health-score gauge (SVG, count-up)

## What's in Day 2

- [ ] Financial health score formula (savings + budget adherence + stability + subscription ratio + emergency fund)
- [ ] Spending pattern queries (top categories, MoM comparison, spike detection)
- [ ] Subscription detector (recurring merchant + similar amount pattern)
- [ ] Recharts: pie / line / bar for the dashboard
- [ ] AI recommendations panel
- [ ] AI chat grounded in user data
- [ ] Vercel deploy + Turso setup
- [ ] Architecture diagram + presentation deck

## Sample CSV

`sample-transactions.csv` (42 rows, Indian merchants, mixed months) — upload via Transactions → CSV upload for an instant realistic dataset.

## Notes on scope decisions

- **Bonus challenges kept:** subscription detector + AI chat + savings simulation slider (Day 2).
- **Bonus challenges skipped:** bill reminder, multi-account UI, comparison/benchmarking.
- **No email verification / OAuth on Day 1** — credentials only, per plan's Day-1 checklist.
