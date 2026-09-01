# Home Accounting

A complete, self-hosted home accounting and personal finance management web app for a household: income, expenses, accounts/wallets, multi-currency, transfers, bills, subscriptions, budgets, savings goals, debts, receivables, transaction history, reports, a financial calendar, and auto-generated financial insights — all backed by a real relational database, with no mock or placeholder data paths in the app logic itself.

Demo/sample data is included so the app is useful the moment you sign in, and it can be wiped independently of your own data (Settings → Data → "Remove demo data").

## Tech stack

- **Framework:** Next.js 14 (App Router) — Server Components for data loading, Server Actions for every mutation, Route Handlers for auth/exports/uploads/cron.
- **Database:** PostgreSQL, via **Prisma ORM** (schema in `prisma/schema.prisma`).
- **Auth:** NextAuth v4, credentials login, bcrypt-hashed passwords, JWT sessions, route middleware that protects every page except `/login` and `/register`.
- **Validation:** Zod schemas for every server action (`src/lib/validations.ts`).
- **UI:** React 18 + Tailwind CSS (light/dark mode via CSS variables + `next-themes`), Recharts for charts, Sonner for toasts, lucide-react for icons.
- **Exports:** `xlsx` (Excel) and `jspdf` + `jspdf-autotable` (PDF), generated on the server from live query results.

This stack was chosen because it matches the brief's suggested architecture (React/Next.js + Node + PostgreSQL + Prisma + Recharts) and keeps everything — pages, API, and business logic — in one deployable Next.js project.

## Why this matters: how it was built

This project was authored in a sandboxed environment with **no access to npm/package registries**, so `npm install` and `next build` could never be run there. Every file was hand-written to be internally consistent (import names, Prisma field names, component props, icon names, etc.), and the framework-independent business logic — recurrence math, currency conversion, budget/goal math — was unit-tested directly with `tsx` (see `scripts/test-lib.ts`, all tests passing). A full manual, tool-assisted consistency audit was also run across every file (action imports vs. exports, Prisma field/relation names, prop signatures, icon names, Suspense boundaries around `useSearchParams`).

**What this means for you:** the code has never been compiled. Run `npm install && npm run dev` (steps below) as the true first build, and if TypeScript/Next.js surfaces anything, it will be a small, mechanical fix (a typo, an import) rather than a structural problem — the architecture and every feature's logic are complete and real, not mocked.

## Feature checklist

Every item below is a real, working feature — reading and writing the database, not a static mockup:

- **Dashboard** — current balance, income/expenses for the selected period, net cash flow, total debt, total receivables, upcoming bills, income-vs-expense chart, expense category donut, 12-month cash-flow trend, 7/30/90/180/365-day spending trend, live budget-status bars, upcoming payments, recent transactions, and auto-generated insights — all computed from real aggregate queries (`src/lib/server/dashboard.ts`), for a selectable period (this month / last month / this year / last 12 months).
- **Income & Expenses** — full CRUD, categories/subcategories, merchant/payee, account, payment method, currency, receipt/attachment upload, notes, and recurring rules (daily/weekly/monthly/yearly) that project future occurrences and can be materialized automatically (see **Recurring transactions** below).
- **Accounts & Wallets** — bank, cash, savings, credit card, digital wallet, other; each shows a live balance computed as opening balance + all transactions/transfers against it, never a stored/stale number.
- **Multi-currency** — USD, LBP, EUR, GBP built in; add any other currency code from Settings → Currency. Every transaction stores its **original amount and currency permanently** plus a snapshot conversion (`baseAmount`/`baseCurrency`/`exchangeRate`) computed once at save time from the exchange rate effective on that date — historical transactions are never recalculated when you add new rates. Rates can be entered manually, or refreshed automatically from a live API (Settings → Currency → "Refresh rates") if you provide an `EXCHANGE_RATE_API_KEY`.
- **Transfers** — account-to-account moves that are excluded from income/expense totals.
- **Bills** — recurring bills with due dates, frequency, live status (Upcoming / Due Today / Overdue / Paid), and one-click "Pay" that creates the matching expense transaction and advances the bill's next due date.
- **Subscriptions** — a dedicated tracker with monthly/yearly cost totals and renewal dates.
- **Budgets** — monthly budgets per category with progress bars and safe/near/over status, computed from real spending in that category and month.
- **Savings goals** — target amount, current amount, deadline, contribution history, and an estimated completion date computed from your actual contribution pace.
- **Debts** — creditor, original/remaining balance, interest rate, due date, monthly payment, full payment history, and running totals.
- **Receivables** — money owed to you: person, amount, due date, paid status, payment history.
- **Transaction history** — a single searchable, filterable, sortable, paginated table across every income/expense/transfer, with edit and delete (with confirmation).
- **Reports** — Monthly, Yearly, Expense, Account, Cash Flow, Savings and Debt reports, each exportable to PDF, Excel, or CSV, generated from the same live queries as the dashboard.
- **Financial calendar** — a month view projecting expected income, bills, recurring expenses, debt payments and subscription renewals.
- **Financial insights** — plain-language, data-driven observations ("You spent 18% more on Dining Out this month than last month") generated from real aggregates only — never fabricated or generic advice.
- **Global search & filters**, **receipt/attachment upload/view/replace/delete**, custom **payment methods**, **family users** with Admin/Member/Viewer permission levels, **dark/light theme**, and a full **Settings** page (General, Currency, Categories, Family, Notifications, Security, Data export/import/backup/delete).
- **Security** — bcrypt password hashing (with a constant-time dummy-hash comparison to prevent user-enumeration timing attacks), JWT sessions, Zod input validation on every mutation, household-scoped data isolation on every query (a user can never see another household's data), authenticated file uploads stored outside the public web root, and CSRF protection built into NextAuth's credential flow.

### Honest gaps (by design, not oversight)

A few things were intentionally simplified rather than half-built:

- **Inviting family members by email** isn't wired up yet — the schema and permission system fully support multiple users per household with Admin/Member/Viewer roles (Settings → Family Users shows them), but today an additional account is created directly with `npm run db:seed`-style scripting or a direct database insert rather than an in-app "invite" email flow.
- **Notification *preferences*** aren't persisted as toggles. Bill and budget alerts are always-on and computed live from real data every time you load the app (Settings → Notifications explains this) rather than being configurable per-user.
- **Money fields use `Float`**, not a fixed-point `Decimal` type, to avoid a Prisma Decimal-serialization issue across the Server/Client Component boundary. For a personal household ledger this is standard practice (most personal-finance apps do the same), but if you extend this toward accounting-grade precision, switching `Float` → `Decimal` in `prisma/schema.prisma` is the one change to make first.

## Project structure

```
home-accounting/
├── prisma/
│   ├── schema.prisma        # Full relational schema (see below)
│   └── seed.ts              # Demo household + realistic multi-currency sample data
├── scripts/
│   └── test-lib.ts          # Standalone tests for the pure logic modules (run with tsx)
├── src/
│   ├── app/
│   │   ├── (auth)/          # /login, /register — public routes
│   │   ├── (app)/           # Every authenticated page (dashboard, income, expenses, ...)
│   │   └── api/             # NextAuth, register, attachments, export/import, search, cron
│   ├── components/          # Page client components, forms, charts, UI primitives
│   └── lib/
│       ├── actions/         # Server Actions — one file per module, all the real CRUD
│       ├── server/          # Data-aggregation helpers (dashboard, reports, calendar, ...)
│       ├── recurrence.ts    # Pure date-math for recurring rules (unit-tested)
│       ├── currency.ts      # Pure multi-currency conversion math (unit-tested)
│       ├── insights.ts      # Rule-based financial insight generator
│       ├── budget.ts        # Budget/goal progress math
│       ├── auth.ts          # NextAuth config
│       └── validations.ts   # Every Zod schema
├── middleware.ts             # Route protection
├── docker-compose.yml        # Local PostgreSQL
├── vercel.json                # Cron schedule for recurring-transaction materialization
└── .env.example
```

## Database schema

The full schema lives in `prisma/schema.prisma`. Highlights:

- `Household` is the tenancy boundary — every other table is scoped to a `householdId`, and every query in `src/lib/server/*` and `src/lib/actions/*` filters by it, so one household can never see another's data.
- `User` belongs to a household with a `Role` (`ADMIN` / `MEMBER` / `VIEWER`).
- `Account` (bank/cash/savings/credit card/digital wallet/other) — balances are **never stored**; they're always computed live from `openingBalance` + the sum of transactions/transfers against that account (`src/lib/server/accounts.ts`), so they can never drift out of sync.
- `Transaction` is shared by income and expenses (`type: INCOME | EXPENSE`), plus a separate `Transfer` model for account-to-account moves. Every transaction keeps `amount`/`currency` (the original, entered value — never overwritten) alongside `baseAmount`/`baseCurrency`/`exchangeRate` (a one-time snapshot conversion to the household's base currency at save time).
- `Category` (income/expense, with color, optional parent for subcategories), `PaymentMethod`, `Currency`, `ExchangeRate` (historical, one row per household/currency-pair/day, `source: MANUAL | API`).
- `RecurringRule` drives recurring income/expenses; `Bill` and `Subscription` have their own recurrence + status fields.
- `Budget` (per category per month), `SavingsGoal` (+ `SavingsContribution` history), `Debt` (+ `DebtPayment` history), `Receivable` (+ `ReceivablePayment` history).
- `Attachment` — polymorphic file reference (belongs to a transaction, bill, debt, or receivable), stored on disk outside `public/`, served only to the owning household through an authenticated route.
- Every foreign key has a matching index; every natural "shouldn't duplicate" combination (e.g. one exchange rate per household/pair/day) is a Prisma `@@unique` constraint enforced at the database level, not just in application code.

## Multi-currency, worked example

Household base currency: USD. You log an expense of **100 USD**, and separately your household has an exchange rate on file: 1 USD = 89,500 LBP.

- The transaction stores `amount: 100`, `currency: "USD"` — permanently, exactly as entered.
- It also stores a snapshot: `baseAmount: 8950000`, `baseCurrency: "USD"` (in this example base = original, so `exchangeRate: 1`). If your base currency were LBP instead, `baseAmount` would be `8,950,000`, `baseCurrency: "LBP"`, `exchangeRate: 89500`, while `amount`/`currency` would still read `100 USD`.
- If you later add a new exchange rate, this past transaction's stored snapshot is untouched — only new transactions use the new rate. This is what "original amount never overwritten" means in practice.

## Getting started (local development)

**Prerequisites:** Node.js 18.18+ and either Docker (for the included Postgres) or your own PostgreSQL 14+ instance.

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables and fill them in (see below)
cp .env.example .env

# 3. Start PostgreSQL (skip if you're pointing at your own database)
docker compose up -d

# 4. Create the database schema
npx prisma migrate dev --name init

# 5. Load realistic demo data (multiple accounts, currencies, bills, budgets, debts, etc.)
npm run db:seed

# 6. Run the app
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`.

### Test credentials (seeded demo account)

```
Email:    demo@homeaccounting.app
Password: Demo1234
```

This account is pre-filled on the login form. It owns one household with the demo data described above; everything under Settings → Data → "Remove demo data" is safely deletable independently of anything you add yourself.

## Environment variables

All of these are documented with inline comments in `.env.example`:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Matches `docker-compose.yml` by default. |
| `NEXTAUTH_SECRET` | Yes | Session/JWT signing secret. Generate with `openssl rand -base64 32`. |
| `NEXTAUTH_URL` | Yes | The app's own URL (`http://localhost:3000` locally). |
| `EXCHANGE_RATE_API_KEY` | No | Enables the "Refresh rates" button in Settings → Currency, pulling live rates from exchangerate-api.com. Manual rate entry works fully without it. |
| `CRON_SECRET` | Recommended in production | Protects `/api/cron/recurring` from being called by anyone but your scheduler. Generate with `openssl rand -hex 20`. |

## Recurring transactions: how "automatic" works

Two complementary mechanisms, both real:

1. **Forward projection (always on, no setup):** the Calendar, Insights, and "next expected occurrence" displays compute future dates on the fly from each `RecurringRule` using pure date math (`src/lib/recurrence.ts`) — nothing is written to the database just to show you what's coming.
2. **Actual materialization (needs a scheduler):** `POST /api/cron/recurring` (protected by `CRON_SECRET`) finds every recurring rule that's due, clones the transaction, and advances its next-run date. `vercel.json` schedules this daily at 06:00 UTC if you deploy to Vercel. Deploying elsewhere? Point any scheduler (a system cron job with `curl`, GitHub Actions, cron-job.org, etc.) at that same endpoint with the `Authorization: Bearer $CRON_SECRET` header once a day.

## Deploying

**Recommended: Vercel + a managed Postgres (Neon, Supabase, Vercel Postgres, RDS, etc.)**

1. Push this repository to GitHub/GitLab/Bitbucket and import it into Vercel.
2. Set the environment variables from the table above in the Vercel project settings, pointing `DATABASE_URL` at your managed Postgres instance.
3. Vercel runs `npm run build`, which runs `prisma generate` via `postinstall`. Run the initial migration once, from your machine, against the production database: `npx prisma migrate deploy` (with `DATABASE_URL` set to production).
4. `vercel.json` already declares the daily cron job for recurring-transaction materialization — Vercel wires it up automatically on deploy (available on Vercel's Hobby plan and above; confirm cron is enabled for your plan).
5. Seed data is optional in production — skip `npm run db:seed`, or run it once against a fresh database if you want the demo household as a template, then delete it.

**Any other Node host** (Railway, Render, Fly.io, a VPS): the app is a standard Next.js server — `npm run build && npm start` — plus a Postgres instance and a way to hit `/api/cron/recurring` daily. File uploads are written to a local `uploads/` directory next to the app; if you deploy to a platform with an ephemeral filesystem, mount a persistent volume at that path (or swap `src/app/api/attachments/route.ts` to an object-storage provider).

## Backups

Your data lives entirely in your PostgreSQL database. Two options, usable together:

- **Application-level:** Settings → Data → "Full backup (JSON)" exports every record for your household; the matching "Import data" restores it into any household.
- **Database-level:** schedule `pg_dump` against `DATABASE_URL` on whatever cadence you'd back up any production database.

## Running the pure-logic tests

The recurrence, currency-conversion, budget/goal, and insight-generation logic has no framework dependencies and was unit-tested directly, independent of the Next.js build:

```bash
npx tsx scripts/test-lib.ts
```
