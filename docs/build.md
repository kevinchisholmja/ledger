# Ledger — Build Overview

The 40,000-foot view. One section per phase. Read this to understand the whole
application without reading everything else.

For the ground-level detail — every task, decision, bug, and fix in the order
it happened — see `activity/2026/`.
For the full architecture decision, v2 data model, and migration plan — see `docs/SPEC.md`.

---

## Phase 1 — Database Schema
**Date:** 2026-05-24 · **Status:** Complete

Defined the complete Postgres schema in Supabase before writing any application code.
Four migrations: enums → tables → views + RLS → nullable amount fix.

Key facts:
- `expenses.amount` is nullable — unknown at insert time for manual and failed-OCR entries
- `expense_source` enum has 4 values: `telegram`, `shortcut`, `manual`, `csv`
- `buckets_summary` view uses `security_invoker = true` but Drizzle service role
  bypasses RLS — every query needs explicit `WHERE user_id = X`

→ `activity/2026/2026-05-24.md`

---

## Phase 2 — Telegram Webhook + Claude Vision OCR
**Date:** 2026-05-24 · **Status:** Complete

Data ingestion pipeline. Telegram bot → receipt photo or PDF → Supabase Storage →
Claude Vision → structured data → `expenses` insert. Three message types: compressed
photo, document (PDF/raw image), plain text. OCR failures stored as `pending_ocr`.

Key facts:
- Claude model: `claude-sonnet-4-6` — do not change without testing on receipt images
- PDFs require `type: "document"` in the Anthropic API, not `type: "image"`
- Storage bucket `receipts` — upload paths must NOT include `receipts/` prefix
- Webhook authenticated via `x-telegram-bot-api-secret-token` header

→ `activity/2026/2026-05-24.md`

---

## Phase 3 — Auth + Drizzle ORM + PWA Dashboard
**Date:** 2026-05-24 · **Status:** Complete

Replaced ad-hoc Supabase JS queries with Drizzle ORM. Supabase SSR auth: magic link
+ Google OAuth. Four routes live: dashboard, review queue, transaction list, budget
manager. Full end-to-end flow: Telegram → OCR → review → confirm → history.

Key facts:
- Drizzle client requires `prepare: false` for the transaction-mode pooler (port 6543)
- Confirming an expense sets BOTH `confirmed_category` AND `category_id`
- `category_id` only set on exact category name match — never auto-created

→ `activity/2026/2026-05-24b.md`

---

## Interlude — Terminology refactor + design direction
**Date:** 2026-05-24 · **Status:** Complete

UI vocabulary: "bucket" → "budget", "expense" → "transaction". Routes renamed.
Colours: `indigo-*` → `blue-*`. `lib/format.ts` added: `formatJMD()`, `formatCurrency()`.

→ `activity/2026/2026-05-24e.md`

---

## Phase 4 — iOS Shortcut + Budget/Category FK Refactor
**Date:** 2026-05-25 · **Status:** Complete

iOS Shortcut endpoint (`POST /api/shortcut/upload`). Budget forms link to `categories`
table via `category_id` FK instead of free-text `group_name`. Separate `/budgets`
and `/categories` routes. `bucket_id` added to `expenses` — required for spend aggregation.

Confirming sets THREE fields: `confirmed_category` (text), `category_id` (UUID), `bucket_id` (UUID).

→ `activity/2026/2026-05-25.md`

---

## Phase 5 — Dashboard Redesign + Period Selector + Plan Page
**Date:** 2026-05-25 · **Status:** Complete

Dark navy sidebar (`bg-[#1B1F3B]`). Period view selector (week|fortnight|month|
quarter|year) with pro-rated budgets. `buckets_summary` retired from dashboard.
Plan page (`/plan`): YNAB-style monthly budget table. Goals page (`/goals`).
Long-horizon budget periods: biennial → decennial.

→ `activity/2026/2026-05-25.md`, `2026-05-25b.md`

---

## Phase 6 — Mobile Nav + Web Upload + Transaction Editing
**Date:** 2026-05-25 · **Status:** Complete

`MobileNav.tsx` (bottom tab bar + More drawer). `UploadButton.tsx` (FAB).
All transactions editable with strict dropdowns. `TransactionModal.tsx`.
List-grounded AI: Claude receives user's actual category and budget IDs.
Preset seeding: 30 categories + 25 budgets auto-seeded on first visit.

Both `MobileNav` and `UploadButton` guard against `/login` with pathname check.

→ `activity/2026/2026-05-25b.md`, `2026-05-25c.md`

---

## Phase 6b — Bank Account Fields + Inline Editing
**Date:** 2026-05-26 · **Status:** Complete

`bank_accounts` extended with `account_number` and `notes` columns (migration 20240012).
Create form updated. Account rows are now click-to-edit inline with all fields.
API routes updated to accept new fields.

→ `activity/2026/2026-05-26.md`

---

## Phase 6c — Spreadsheet Analysis + Architecture Decision
**Date:** 2026-05-26 · **Status:** Complete (no code changes — design only)

Reviewed the existing Google Sheets financial ledger. Identified that the `expenses`
table (debit-only) cannot model the full transaction space: income, chargebacks,
refunds, transfers, bank fees, interest.

**Decision:** Rebuild as YNAB + Quicken hybrid.
- **Data layer:** Ledger-style (transactions with direction + type)
- **Budget UI:** YNAB-style (TBB → envelope assignment)
- **Register UI:** Quicken-style (per-account register, running balance, cleared/reconciled)

Full spec documented in `docs/SPEC.md`.

→ `activity/2026/2026-05-26.md`, `docs/SPEC.md`

---

## Phase 6d — Master SPEC + Transaction Register
**Date:** 2026-05-26 · **Status:** Complete

`docs/SPEC.md` — living master specification covering phases 1–6, the core problem,
the architecture decision, v2 data model (`transactions`, `payees`, `budget_assignments`),
and migration plan (Phases A1–A6).

`/register` page — Quicken-style account register table mirroring the Google Sheets
layout. Columns: Account · Paid Date · Invoice Date · Ref # · Payee · Category ·
Budget · Memo · Mode · Clr · DEBIT · CREDIT · Balance · Receipt. Phase A2 columns
(Account, Invoice Date, Ref #, CREDIT) show `─` placeholder until Phase A3.
All 9 sidebars updated to include Register (▦).

→ `activity/2026/2026-05-26.md`

---

## Phase 7 — Documentation + Configuration Overhaul
**Date:** 2026-05-27 · **Status:** Complete

Complete professional documentation and configuration rebuild.

**`rules/` directory (5 files, scoped by concern):**
- `code-style.md` — comments policy, naming, TypeScript, scope discipline
- `security.md` — auth patterns, RLS, input validation, secrets
- `api-conventions.md` — REST patterns, route inventory, PATCH whitelist
- `database.md` — Drizzle patterns, migration rules, Phase A transition state
- `ui-standards.md` — colours, Tailwind v4, currency, z-index stack

**`CLAUDE.md`** — complete overhaul. Now lean (~60 lines), imports rule files via `@`,
references `docs/SPEC.md` for architecture, highlights the three non-optional rules.

**Subdirectory CLAUDE.md files (auto-loaded by Claude when working in those dirs):**
- `app/api/CLAUDE.md` — API route conventions + route inventory
- `lib/db/CLAUDE.md` — schema state, type exports, enum names, transition notes

**`.claude/settings.json`** — project-level permissions and hooks:
- `deny`: force push, hard reset, `rm -rf`, DROP TABLE, TRUNCATE, `vercel --prod`
- `allow`: safe git, npm, npx, vercel logs, grep, find
- `PostToolUse(Edit|Write)` hook: TypeScript error check after every file edit
- `PreToolUse(Bash)` hook: block destructive operation patterns at the gate

**Docs updated:** `docs/build.md`, `docs/architecture.md`, `docs/runbook/database.md`

→ `activity/2026/2026-05-27.md`

---

## Phase A1 — Create v2 Tables
**Date:** 2026-05-27 · **Status:** Complete

Created the v2 data model tables alongside the existing ones. No existing data
touched. App unchanged — all code still reads from `expenses`.

Migration `20240013_create_transactions_payees_assignments.sql`:
- `CREATE TABLE transactions` — full v2 model with direction, type, two dates,
  cleared/reconciled, `flagged`, `transfer_pair_id`, `original_transaction_id`
- `CREATE TABLE payees` — named parties with default category/budget learning
- `CREATE TABLE budget_assignments` — TBB → envelope flow, unique per bucket per month
- `ALTER TABLE categories ADD COLUMN type` — `'expense' | 'income'`, default `'expense'`
- `ALTER TABLE bank_accounts ADD COLUMN on_budget` — YNAB on/off-budget invariant

`lib/db/schema.ts` updated with all new table definitions and v2 type exports.
`lib/seed.ts` updated: 7 income-type preset categories added (Salary, Rental Income,
Commission, Dividends, Interest Earned, Refund / Reimbursement, Other Income).
All expense preset categories now explicitly carry `type: 'expense'`.

→ `activity/2026/2026-05-27.md`

---

## Phase A3 — Data Migration
**Status:** Skipped (no important data in DB)

No data migration needed. User confirmed DB was empty — truncated `expenses` and `bank_entries`.
Jumped directly to Phase A4.

---

## Phase A4 — Full Rewrite: expenses → transactions
**Date:** 2026-05-27 · **Status:** Complete

Rewrote all application code to read/write from the v2 `transactions` table.
No functional change from the user's perspective — all pages and flows work identically.

**Migration applied:**
- `20240014_make_transactions_amount_account_nullable.sql` — made `amount` and `account_id`
  nullable on `transactions` (amount unknown for pending_ocr entries; account assigned later)

**Files changed (17 total):**
- `lib/ocr.ts` — `merchant` → `payee_name` in OcrResult
- `app/api/upload/route.ts` — Drizzle insert into `transactions`
- `app/api/shortcut/upload/route.ts` — Drizzle insert into `transactions`
- `app/api/telegram/webhook/route.ts` — Drizzle insert into `transactions`; text entry uses `memo`
- `app/api/transactions/[id]/route.ts` — NEW: PATCH + DELETE for v2 transactions
- `app/api/transactions/[id]/retry-ocr/route.ts` — NEW: retry OCR for v2 transactions
- `app/api/review/count/route.ts` — count from `transactions`
- `app/review/page.tsx` — query from `transactions`
- `app/review/ReviewCard.tsx` — uses `Transaction` type; `payee_name`, `memo`; new API path
- `app/components/TransactionListClient.tsx` — new TxRow: `payee_name`, `direction`, `category_name`
- `app/components/TransactionModal.tsx` — new API path `/api/transactions/[id]`
- `app/transactions/page.tsx` — query from `transactions` with category join
- `app/page.tsx` — dashboard aggregates from `transactions`; recent list shows `payee_name`
- `app/accounts/page.tsx` — query from `transactions`; sidebar now includes Register
- `app/plan/page.tsx` — spending aggregates from `transactions`
- `app/register/page.tsx` — real `invoice_date`, `reference_num`, `cleared`, `direction` columns
- `app/register/RegisterClient.tsx` — `merchant` → `payee_name`; phase notice removed
- `app/api/expenses/` — DELETED (replaced by `app/api/transactions/`)

**Key field mapping (v1 → v2):**
| Old (expenses) | New (transactions) |
|---|---|
| `merchant` | `payee_name` |
| `raw_ocr_text` | `memo` (for text-only Telegram messages) |
| `confirmed_category` (text) | dropped — `category_id` FK is authoritative |
| `ai_suggested_category` | dropped — OCR writes to `category_id` directly |
| `expense_source` enum | `source text` |
| `expense_status` enum | `status text` |

→ `activity/2026/2026-05-27.md`
