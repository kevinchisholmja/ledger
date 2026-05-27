@AGENTS.md
@rules/code-style.md
@rules/security.md
@rules/database.md
@rules/ui-standards.md
@rules/api-conventions.md

# Ledger — AI Agent Instructions

## Read this first
Before making any architectural decision, read **`docs/SPEC.md`** — it is the single
source of truth for the vision, current state, v2 data model, and migration plan.

## Stack (quick reference)
| Layer | Technology | Gotcha |
|-------|-----------|--------|
| Framework | Next.js **16.2.6** App Router | Check `node_modules/next/package.json` before using any Next.js API |
| Styling | Tailwind **v4** | `@import "tailwindcss"` — NOT `@tailwind` directives |
| DB ORM | Drizzle + `postgres` driver | `prepare: false`, port **6543** |
| Auth + Storage | Supabase JS (`@supabase/ssr`) | Not for DB queries — Drizzle only |
| AI | `claude-sonnet-4-6` | Do not change model without testing on receipts |

## Current phase: Phase A2
The app is in active **data model transition** (expenses → transactions).
See `docs/SPEC.md §6` for the full migration plan.

**Right now:**
- DB table `expenses` still holds all transactions (debit-only model)
- DB table `transactions` does not exist yet (created in Phase A1)
- Do NOT rename `expenses` or `buckets` — that happens in Phase A3/A6
- New features: write against `transactions` once Phase A1 is complete

## DB table names (current — do not rename yet)
| UI name | DB table | Migration phase |
|---------|----------|-----------------|
| Transaction | `expenses` | Renamed to `transactions` in Phase A3 |
| Budget | `buckets` | Stays as `buckets` forever |
| — | `bank_entries` | Dropped in Phase A6 |

## Three rules that are never optional
1. `await requireUser()` — first line of every route handler and server component
2. `.where(eq(table.user_id, user.id))` — every Drizzle query
3. Confirming a transaction sets **three fields**: `confirmed_category` (text) + `category_id` (UUID) + `bucket_id` (UUID)

## Currency
Always `formatJMD()` or `formatCurrency()` from `lib/format.ts` — never inline.

## Budget and Category fields
Always strict `<select>` dropdowns from DB — never `<input>` or datalist.

## Navigation
9 sidebar items (in order): Dashboard, Plan, Goals, Review, Transactions, Register,
All Accounts, Budgets, Categories. Every new page must include all 9 with the correct
`active` prop. Copy the pattern from `app/categories/page.tsx`.

## Migrations
Apply via Supabase Dashboard SQL Editor → project `evdbqegscpeaabzzcwvw`.
File naming: `supabase/migrations/2024NNNN_description.sql`. Always use `IF NOT EXISTS`.

## Key files
| File | Purpose |
|------|---------|
| `docs/SPEC.md` | Master project spec — vision, model v2, migration plan |
| `lib/db/schema.ts` | All table definitions — single source of truth |
| `lib/auth.ts` | `requireUser()` — call this first, always |
| `lib/format.ts` | Currency helpers — use these, never inline |
| `lib/ocr.ts` | Receipt OCR via Claude Vision |
| `lib/seed.ts` | Preset category + budget seeding |
| `lib/period.ts` | Period math (non-client module) |
| `app/components/TransactionModal.tsx` | Reusable transaction edit modal |
| `app/components/MobileNav.tsx` | Bottom nav — guard against /login |
| `app/components/UploadButton.tsx` | Receipt FAB — guard against /login |
