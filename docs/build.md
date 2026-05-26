# Ledger — Build Overview

The 40,000-foot view. One section per phase. Read this to understand the whole
application without reading everything else.

For the ground-level detail — every task, decision, bug, and fix in the order
it happened — see `activity/2026/`.
For the context behind each phase — goal, scope, key constraints — see `activity/phases/`.

---

## Phase 1 — Database Schema
**Date:** 2026-05-24 · **Status:** Complete

Defined the complete Postgres schema in Supabase before writing any application code.
Four migrations: enums → tables → views + RLS → nullable amount fix.

The schema covers the full application lifecycle including Phase 4+ features
(bank reconciliation, CSV import) so future work does not require breaking migrations.

Key facts any developer must know:
- `expenses.amount` is nullable — unknown at insert time for manual and failed-OCR entries
- `expense_source` enum has 4 values: `telegram`, `shortcut`, `manual`, `csv`
- `buckets_summary` view uses `security_invoker = true` but Drizzle service role
  bypasses RLS — every query needs explicit `WHERE user_id = X`
- Migrations applied via Supabase Management API (direct port 5432/6543 was blocked)

→ `activity/phases/phase-1-schema.md` — full scope and decisions  
→ `activity/2026/2026-05-24.md` — day-level detail and bug log  
→ `supabase/migrations/` — the SQL

---

## Phase 2 — Telegram Webhook + Claude Vision OCR
**Date:** 2026-05-24 · **Status:** Complete

Built the data ingestion pipeline: Telegram bot receives receipt photos and PDFs,
Claude Vision extracts structured data (merchant, amount, currency, date, category),
result stored in Supabase. No UI — purely backend.

Three Telegram message types handled: compressed photo, document (PDF or raw image),
and plain text (manual entry). OCR failures are stored with `status: "pending_ocr"`
so the user can retry from the review UI.

Key facts:
- Claude model: `claude-sonnet-4-6` — do not change without testing on receipt images
- PDFs require `type: "document"` in the Anthropic API, not `type: "image"`
- Storage bucket `receipts` — upload paths must NOT include `receipts/` prefix
- Webhook authenticated via `x-telegram-bot-api-secret-token` header
- Single-user app — all expenses pinned to `LEDGER_USER_ID` env var

→ `activity/phases/phase-2-telegram.md` — full scope and decisions  
→ `activity/2026/2026-05-24.md` — day-level detail and bug log  
→ `app/api/telegram/webhook/route.ts` — the handler  
→ `lib/ocr.ts` — OCR logic (extracted in Phase 3)

---

## Phase 3 — Drizzle ORM, Auth, PWA Dashboard
**Date:** 2026-05-24 · **Status:** Complete

Replaced ad-hoc Supabase JS queries with Drizzle ORM (schema lives in repo as
TypeScript). Added Supabase SSR auth with magic-link email login. Built the full
PWA UI across four routes: dashboard, review queue, expense list, budget manager.

The application is now fully functional end-to-end:
Telegram → OCR → review → confirm → expense history.

Key facts:
- Drizzle client requires `prepare: false` for the transaction-mode pooler (port 6543)
- `proxy.ts` not `middleware.ts` — Next.js 16 renamed the file convention
- Confirming an expense sets BOTH `confirmed_category` AND `category_id` — the view
  aggregates on `category_id`; setting only one breaks budget reporting
- `category_id` only set on exact category name match — never auto-created
- Auth redirect URL must be registered in Supabase dashboard before login works

→ `activity/phases/phase-3-dashboard.md` — full scope and decisions  
→ `activity/2026/2026-05-24b.md` — day-level detail and bug log  
→ `docs/architecture.md` — system design and data flow  
→ `docs/runbook/` — deployment and operations

---

## Interlude — Terminology refactor + design direction
**Date:** 2026-05-24 · **Status:** Complete

Before Phase 4 work began, a housekeeping pass was done to clean up naming and
establish a design north star.

**Terminology:** "bucket" → "budget" and "expense" → "transaction" throughout the UI.
Both are the industry-standard terms used by Copilot, Monarch, and YNAB. DB table
names (`buckets`, `expenses`) are unchanged — the rename is UI-layer only.

**Routes:** `/buckets` → `/budgets`, `/expenses` → `/transactions`,
`/api/buckets` → `/api/budgets`.

**Colours:** `indigo-*` → `blue-*` (Copilot Royal Blue as primary accent).
Zero indigo references remain.

**Design north star:** Copilot Money. Their category tab layout (horizontal progress
bars, colour-coded by spend %, spent left + budget right) is the target for the
dashboard budget cards. `design-reference/` holds screenshots — gitignored (22MB).

**`lib/format.ts`:** `formatJMD()` and `formatCurrency()` helpers. All inline
`J$${...}` formatting will be replaced in the P4 UI pass.

→ `activity/2026/2026-05-24e.md` — full detail and decisions

---

## Phase 4 — iOS Shortcut + Budget/Category FK refactor
**Date:** 2026-05-25 · **Status:** Complete

**iOS Shortcut:** `POST /api/shortcut/upload` — multipart form-data, authenticated
via `x-shortcut-secret` header matching `SHORTCUT_SECRET` env var. Same OCR
pipeline as Telegram. Source = `shortcut`. Setup guide at `docs/ios-shortcut.md`.

**Budget/Category refactor:** Replaced the free-text `group_name` field on budgets
with a `category_id` FK pointing to the `categories` table. `group_name` column
remains in the DB for backward compat but is never written from the UI. All budget
display now shows the linked category name. The Plan page groups budgets by category
via a LEFT JOIN.

**Separate routes:** `/budgets` and `/categories` are completely independent pages
(no tabs). Categories (◈) added to all sidebars and the mobile More drawer.

**`bucket_id` on expenses:** confirming a transaction now saves `bucket_id` alongside
`category_id` and `confirmed_category` — required for `buckets_summary` aggregation.

Key facts:
- Confirming sets THREE fields: `confirmed_category` (text), `category_id` (UUID), `bucket_id` (UUID)
- `bucket_id` missing → budget cards show $0 spent
- `category_id` missing → plan page category grouping breaks

→ `activity/2026/2026-05-25.md` and `2026-05-25b.md` — full detail

---

## Phase 5 — Dashboard redesign + Period selector + Plan page
**Date:** 2026-05-25 · **Status:** Complete

Major UI overhaul bringing the app to a YNAB-style layout across all pages.

**Dark navy sidebar:** `bg-[#1B1F3B]` replacing the white sidebar. 3-column layout
on md+: navy sidebar | center content | white right summary panel.

**Period view selector:** Dashboard accepts `?period=week|fortnight|month|quarter|year`.
`lib/period.ts` holds all period math. `PeriodSelector.tsx` pushes `?period=X` to
the URL. Budgets are pro-rated: `proratedAmount = budget.amount × (viewDays / nativeDays)`.
`buckets_summary` view no longer used — replaced by a direct Drizzle query with
dynamic date ranges.

**Long-horizon budget periods:** `biennial`, `triennial`, `quinquennial`, `decennial`
added to the `budget_period` enum (migration 20240006).

**Plan page** (`/plan`): YNAB-style monthly budget planning. Month navigator,
status banner, collapsible category groups, inline ASSIGNED editing that back-
calculates native period amounts. `POST /api/budgets/rename-group` for group renames.

**Goals page** (`/goals`): Multi-year savings goals with monthly allocation, progress
tracking, and projected completion date.

**All Accounts page** (`/accounts`): Full transaction ledger with bank account
balance editing. Uses `TransactionListClient` for click-to-expand editing.

→ `activity/2026/2026-05-25.md` and `2026-05-25b.md` — full detail

---

## Phase 6 — Mobile nav + Web upload + Transaction editing
**Date:** 2026-05-25 · **Status:** Complete

**Mobile bottom nav** (`MobileNav.tsx`): Bottom tab bar on all pages (hidden on
`/login`). Primary tabs: Home, Review (pending badge), Txns, Plan. "More" opens a
slide-up drawer with Goals, All Accounts, Budgets, Categories, Sign out. Pending
count fetched from `GET /api/review/count` on each route change. Safe area handled
via `env(safe-area-inset-bottom)` inline style.

**Web receipt upload** (`UploadButton.tsx`): Floating FAB (bottom-right, hidden on
`/login`). Accepts jpeg/png/heic/heif/webp/pdf. Runs same OCR pipeline via
`POST /api/upload`. Navigates to `/review` on success. States: idle / uploading /
error (auto-clears after 4 s).

**Transaction editing on all pages:** Every transaction on `/transactions` and
`/accounts` is now click-to-expand editable. Budget and Category fields are strict
dropdowns — values must come from the `buckets` and `categories` tables respectively.
Free-text category entry removed from both `TransactionListClient` and `ReviewCard`.
`TransactionListClient` moved to `app/components/` and shared across both pages.

Key facts:
- `MobileNav` and `UploadButton` live in root `app/layout.tsx` and guard against
  `/login` with `if (pathname === "/login") return null`
- Saving a transaction sets all three: `bucket_id`, `category_id`, `confirmed_category`
- `category_id` is always a UUID from the categories table — never a free-text match

→ `activity/2026/2026-05-25b.md` — full detail
