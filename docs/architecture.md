# Ledger — Architecture

## Overview

A personal finance PWA that ingests receipts via Telegram or iOS Shortcut, extracts data with Claude Vision, and stores everything in Supabase. A Next.js dashboard provides review, confirmation, and budget tracking with a dynamic period view selector.

## Stack

| Layer | Technology |
|---|---|
| Frontend / API | Next.js 16.2.6 (App Router), Vercel |
| Database ORM | Drizzle ORM (`drizzle-orm` + `postgres` driver) |
| Database | Supabase (Postgres 17, RLS) |
| Auth | Supabase Auth (`@supabase/ssr`) — email magic link + Google OAuth |
| Storage | Supabase Storage (`receipts` bucket) |
| AI / OCR | Anthropic Claude (`claude-sonnet-4-20250514`) — vision + document |
| Ingestion | Telegram Bot API → webhook, iOS Shortcut → `/api/shortcut/upload` |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`) |

## Data flows

**Telegram receipt:**
```
User sends photo/PDF to Telegram bot
  → POST /api/telegram/webhook (Vercel, verified via secret token)
  → Download file from Telegram CDN
  → Upload to Supabase Storage (receipts/{userId}/{uuid}.ext)
  → Send to Claude Vision/Document → extract merchant, amount, date, category
  → INSERT into expenses (status: pending_review or pending_ocr on failure)
  → Reply to user in Telegram with summary
```

**iOS Shortcut receipt:**
```
User shares photo from iPhone Photos app
  → POST /api/shortcut/upload (multipart form-data)
  → Auth: x-shortcut-secret header vs SHORTCUT_SECRET env var
  → Same OCR + insert flow as Telegram
```

**Review + confirm:**
```
User opens /review in browser
  → Drizzle query: expenses WHERE status IN (pending_review, pending_ocr)
  → User sets merchant, amount, date, category, budget
  → PATCH /api/expenses/:id → updates expense + sets bucket_id + category_id
  → status → confirmed
```

## Infrastructure

| | Value |
|---|---|
| Supabase project ref | `evdbqegscpeaabzzcwvw` |
| Supabase region | us-east-1 (North Virginia) |
| Supabase dashboard | https://supabase.com/dashboard/project/evdbqegscpeaabzzcwvw |
| Vercel project | kevinchisholmjas-projects/ledger |
| Production URL | https://ledger-gules-seven.vercel.app |
| Telegram webhook URL | https://ledger-gules-seven.vercel.app/api/telegram/webhook |
| Postgres port | 6543 (transaction-mode pooler — requires `prepare: false`) |

## Database schema (public schema)

| Table | Purpose |
|---|---|
| `buckets` | Budget definitions — name, period, amount, icon, color |
| `expenses` | Every transaction — receipt, OCR output, confirmed data |
| `categories` | User-defined categories, optionally linked to a bucket |
| `bank_entries` | Imported bank statement rows for reconciliation |

| View | Purpose |
|---|---|
| `buckets_summary` | Per-bucket monthly aggregates (month_spent, month_remaining, year_spent). `security_invoker = true` — still requires explicit `WHERE user_id` in Drizzle queries because service role bypasses RLS. **Not used in the dashboard since P5** (replaced by dynamic per-period Drizzle query). |

**Key rules:**
- `expenses.amount` is nullable — rows can be inserted before OCR completes.
- `expenses.bucket_id` links spending to a budget — required for spend aggregation.
- Confirming an expense must set `confirmed_category` (text), `category_id` (UUID), AND `bucket_id` (UUID).

## Drizzle ORM usage

Drizzle is the **only** DB client for application queries. Supabase JS is used only for auth sessions and storage uploads.

| File | Role |
|---|---|
| `lib/db/client.ts` | Drizzle client — `postgres` driver, `prepare: false` |
| `lib/db/schema.ts` | All table definitions, enum types, inferred TS types |
| `app/page.tsx` | Dashboard — buckets + expenses queries, pro-rated aggregation |
| `app/transactions/page.tsx` | Transactions list |
| `app/review/page.tsx` | Review queue |
| `app/budgets/page.tsx` | Budgets list |
| `app/api/budgets/route.ts` | POST /api/budgets |
| `app/api/budgets/[id]/route.ts` | DELETE /api/budgets/:id |
| `app/api/expenses/[id]/route.ts` | PATCH /api/expenses/:id (confirm) |
| `app/api/expenses/[id]/retry-ocr/route.ts` | POST retry OCR |
| `app/api/categories/route.ts` | GET/POST /api/categories |

## Period view selector (P5)

`lib/period.ts` is a plain (non-client) module holding shared period logic:
- `ViewPeriod` type: `"week" | "fortnight" | "month" | "quarter" | "year"`
- `isValidViewPeriod()` — used by the server page to validate `searchParams`
- `BUDGET_PERIOD_DAYS` — native period → days (for pro-rating)
- `VIEW_PERIOD_DAYS` — view window → days

Dashboard reads `?period=X` from `searchParams` and pro-rates each budget:
`proratedAmount = budget.amount × (viewPeriodDays / budgetNativePeriodDays)`

## Budget period types

| Value | Duration | Example use |
|---|---|---|
| `weekly` | 7 days | Coffee, fuel |
| `fortnightly` | 14 days | Payroll-aligned spending |
| `monthly` | ~30.4 days | Groceries, rent, utilities |
| `quarterly` | ~91.3 days | Insurance premiums |
| `annual` | 365.25 days | Subscriptions, gym |
| `biennial` | 2 years | Electronics |
| `triennial` | 3 years | Car maintenance |
| `quinquennial` | 5 years | Vacations, HVAC |
| `decennial` | 10 years | Roof repairs, college fund |

## Directory structure

```
app/
  api/
    budgets/
      route.ts              ← GET + POST /api/budgets
      [id]/route.ts         ← DELETE /api/budgets/:id
    categories/route.ts     ← GET + POST /api/categories
    expenses/
      [id]/route.ts         ← PATCH /api/expenses/:id (confirm)
      [id]/retry-ocr/route.ts
    shortcut/upload/route.ts ← iOS Shortcut endpoint
    telegram/webhook/route.ts
    auth/callback/route.ts  ← OAuth + magic link callback
  budgets/
    page.tsx                ← Budget management page
    BudgetsClient.tsx       ← Create / delete budget form
  review/
    page.tsx                ← Review queue (server)
    ReviewCard.tsx          ← Confirm / edit card (client)
  transactions/page.tsx     ← All transactions, grouped by date
  components/
    LogoutButton.tsx
    PeriodSelector.tsx      ← "use client" — period dropdown
  page.tsx                  ← Dashboard (server, 3-column layout)
  layout.tsx
  globals.css
docs/
  architecture.md           ← this file
  build.md                  ← phase-by-phase build log
  env-vars.md               ← environment variable reference
  ios-shortcut.md           ← iOS Shortcut setup guide
  runbook/
    README.md               ← index
    deploying.md
    google-oauth.md
    telegram.md
    database.md
    incident-log.md
lib/
  auth.ts                   ← requireUser() server helper
  db/
    client.ts               ← Drizzle client
    schema.ts               ← all tables + enums
  format.ts                 ← formatJMD(), formatCurrency()
  ocr.ts                    ← runOcr() — Claude Vision/Document
  period.ts                 ← ViewPeriod type + period math utils
supabase/
  migrations/
    20240001_ledger_phase1.sql       ← core schema
    20240002_ledger_bank_entries_type.sql
    20240003_add_confirmed_category.sql
    20240004_amount_nullable.sql
    20240005_fix_buckets_schema.sql
    20240006_add_long_budget_periods.sql ← biennial/triennial/quinquennial/decennial
```
