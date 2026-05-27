# Ledger — Architecture

> For the full product vision, v2 data model, and migration plan, see `docs/SPEC.md`.
> This file covers the technical stack and runtime architecture.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend / API | Next.js 16.2.6 (App Router), Vercel |
| Database ORM | Drizzle ORM (`drizzle-orm` + `postgres` driver) |
| Database | Supabase (Postgres 17, RLS) |
| Auth | Supabase Auth (`@supabase/ssr`) — email magic link + Google OAuth |
| Storage | Supabase Storage (`receipts` bucket) |
| AI / OCR | Anthropic Claude (`claude-sonnet-4-6`) — vision + document |
| Ingestion | Telegram Bot API → webhook, iOS Shortcut → `/api/shortcut/upload` |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`) |

## Infrastructure

| | Value |
|--|-------|
| Supabase project ref | `evdbqegscpeaabzzcwvw` |
| Supabase region | us-east-1 (North Virginia) |
| Vercel project | kevinchisholmjas-projects/ledger |
| Production URL | https://ledger-gules-seven.vercel.app |
| Telegram webhook URL | https://ledger-gules-seven.vercel.app/api/telegram/webhook |
| Postgres port | 6543 (transaction-mode pooler — requires `prepare: false`) |

## Data flows

**Telegram receipt:**
```
User sends photo/PDF to Telegram bot
  → POST /api/telegram/webhook (Vercel, verified via secret token)
  → Download file from Telegram CDN
  → Upload to Supabase Storage (receipts/{userId}/{uuid}.ext)
  → runOcr(buffer, mimeType, { categories, budgets }) → Claude Vision
    Claude matches category/budget to user's actual lists → returns UUIDs
  → INSERT into expenses (status: pending_review or pending_ocr on failure)
  → Reply to user with merchant, amount, category name
```

**iOS Shortcut receipt:**
```
User shares photo from iPhone Photos app
  → POST /api/shortcut/upload (multipart form-data)
  → Auth: x-shortcut-secret header vs SHORTCUT_SECRET env var
  → Same OCR + insert flow as Telegram
```

**Web receipt upload:**
```
User taps floating "Upload receipt" button (bottom-right FAB, hidden on /login)
  → File picker → image (jpeg/png/heic/heif/webp) or PDF selected
  → POST /api/upload (multipart form-data, session auth via requireUser())
  → Upload to Supabase Storage → runOcr() → INSERT into expenses
  → Navigate to /review
```

**Review + confirm:**
```
User opens /review
  → expenses WHERE status IN (pending_review, pending_ocr)
  → User sets merchant, amount, date, category (select from categories), budget (select from buckets)
  → PATCH /api/expenses/:id → status=confirmed + category_id + confirmed_category + bucket_id
```

**Edit confirmed transaction:**
```
User clicks any row on /transactions, /accounts, or /register
  → TransactionModal opens with all fields editable
  → PATCH /api/expenses/:id → updates all edited fields
```

## Database schema (current — Phase A2)

### Tables
| Table | Purpose |
|-------|---------|
| `expenses` | All transactions (v1, debit-only — being replaced by `transactions` in Phase A3) |
| `buckets` | Budget envelopes |
| `categories` | User categories (type column coming in Phase A1) |
| `bank_accounts` | Bank/cash accounts |
| `bank_entries` | Imported CSV bank rows (being replaced in Phase A6) |
| `goals` | Multi-year savings goals |

### Views
| View | Purpose |
|------|---------|
| `buckets_summary` | Per-bucket monthly aggregates. `security_invoker = true` — still needs explicit `WHERE user_id`. Not used in dashboard since Phase 5. |

### Upcoming (Phase A1+)
| Table | Purpose |
|-------|---------|
| `transactions` | v2 transaction model — direction, type, two dates, cleared/reconciled |
| `payees` | Named parties with default category/budget learning |
| `budget_assignments` | TBB → budget envelope assignments (YNAB-style) |

**Critical schema rules:**
- `expenses.amount` is nullable (migration 20240004 dropped NOT NULL)
- Every Drizzle query MUST include `WHERE user_id = [authenticated user id]`
- Confirming a transaction sets THREE fields: `confirmed_category`, `category_id`, `bucket_id`

## Drizzle ORM usage

Drizzle is the **only** DB client for application queries. Supabase JS is used only
for auth sessions and storage uploads.

| File | Role |
|------|------|
| `lib/db/client.ts` | Drizzle client — `postgres` driver, `prepare: false` |
| `lib/db/schema.ts` | All table definitions, enum types, inferred TS types |

## Configuration and rules

| File | Purpose |
|------|---------|
| `CLAUDE.md` | AI agent instructions — imports rule files via `@` |
| `rules/code-style.md` | Comments, naming, TypeScript, scope discipline |
| `rules/security.md` | Auth patterns, RLS, input validation, secrets |
| `rules/api-conventions.md` | REST patterns, route inventory, PATCH whitelist |
| `rules/database.md` | Drizzle patterns, migration rules, Phase A transition state |
| `rules/ui-standards.md` | Colours, Tailwind v4, currency formatting, z-index stack |
| `app/api/CLAUDE.md` | Auto-loaded when working in API routes |
| `lib/db/CLAUDE.md` | Auto-loaded when working in DB layer |
| `.claude/settings.json` | Tool permissions + TypeScript check hook + deny rules |
| `docs/SPEC.md` | Master project specification |

## Directory structure

```
app/
  api/
    CLAUDE.md               ← auto-loaded API context
    budgets/
      route.ts              ← GET + POST /api/budgets
      [id]/route.ts         ← PATCH + DELETE /api/budgets/:id
      rename-group/route.ts ← PATCH /api/budgets/rename-group
    categories/
      route.ts              ← GET + POST /api/categories
      [id]/route.ts         ← DELETE /api/categories/:id
    accounts/
      route.ts              ← GET + POST /api/accounts
      [id]/route.ts         ← PATCH + DELETE /api/accounts/:id
    expenses/
      [id]/route.ts         ← PATCH /api/expenses/:id (→ /api/transactions/:id in Phase A4)
      [id]/retry-ocr/route.ts
    review/
      count/route.ts        ← GET /api/review/count (pending badge)
    shortcut/upload/route.ts ← iOS Shortcut endpoint
    telegram/webhook/route.ts
    upload/route.ts         ← Web receipt upload
    auth/callback/route.ts  ← OAuth + magic link callback
  budgets/
    page.tsx                ← Budget management
    BudgetsClient.tsx
  categories/
    page.tsx                ← Category management
    CategoriesClient.tsx
  review/
    page.tsx                ← Review queue (server)
    ReviewCard.tsx
  transactions/
    page.tsx                ← All transactions, editable
  register/
    page.tsx                ← Quicken-style account register (Phase A2)
    RegisterClient.tsx
  accounts/
    page.tsx                ← All Accounts + bank account management
    AccountsClient.tsx
  goals/
    page.tsx                ← Goals (server)
    GoalsClient.tsx
  plan/
    page.tsx                ← YNAB-style monthly plan (server)
    PlanClient.tsx
  components/
    LogoutButton.tsx
    MobileNav.tsx           ← bottom tab bar + More drawer (hidden on /login)
    PeriodSelector.tsx      ← period dropdown (use client)
    TransactionListClient.tsx ← click-to-edit transaction list
    TransactionModal.tsx    ← full-screen transaction edit modal
    UploadButton.tsx        ← floating receipt upload FAB (hidden on /login)
  page.tsx                  ← Dashboard (server, 3-column layout)
  layout.tsx                ← Root layout — MobileNav + UploadButton
  globals.css
docs/
  SPEC.md                   ← Master project specification (architecture decisions, v2 model, roadmap)
  architecture.md           ← This file
  build.md                  ← Phase-by-phase build log
  env-vars.md               ← Environment variable reference
  ios-shortcut.md           ← iOS Shortcut setup guide
  runbook/
    README.md
    deploying.md
    google-oauth.md
    telegram.md
    database.md             ← Migration inventory + procedures
    incident-log.md
rules/
  code-style.md             ← Comments, naming, TypeScript, scope
  security.md               ← Auth, RLS, input validation, secrets
  api-conventions.md        ← REST patterns, route inventory
  database.md               ← Drizzle patterns, migration rules
  ui-standards.md           ← Colours, Tailwind, currency, z-index
lib/
  auth.ts                   ← requireUser() server helper
  db/
    CLAUDE.md               ← auto-loaded DB layer context
    client.ts               ← Drizzle client
    schema.ts               ← all tables + enums + type exports
  format.ts                 ← formatJMD(), formatCurrency()
  ocr.ts                    ← runOcr() — Claude Vision/Document, list-grounded
  period.ts                 ← ViewPeriod type + period math (non-client)
  seed.ts                   ← seedPresetsIfEmpty() — 30 categories + 25 budgets
.claude/
  settings.json             ← project permissions + hooks (committed)
  settings.local.json       ← local dev overrides (gitignored)
supabase/
  migrations/               ← 12 applied migrations (see runbook/database.md)
activity/
  2026/                     ← daily session logs
notes/
  The_core_problem.md       ← original analysis of the expenses-only model problem
```

## Period view selector

`lib/period.ts` is a plain (non-client) module:
- `ViewPeriod` type: `"week" | "fortnight" | "month" | "quarter" | "year"`
- `BUDGET_PERIOD_DAYS` — native period → days (pro-rating)
- `VIEW_PERIOD_DAYS` — view window → days

Dashboard reads `?period=X` and pro-rates: `proratedAmount = budget.amount × (viewDays / nativeDays)`
