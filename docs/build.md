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

## Phase 4 — buckets_summary + iOS Shortcut
**Date:** TBD · **Status:** Scoped, not yet started

Two parts that make the app fully daily-usable:

**Part A — Dashboard redesign:** wire the existing `buckets_summary` Postgres view
to the dashboard. Budget cards will show month_spent, month_remaining, year_spent,
and a Copilot-style progress bar coloured by spend level. Currently the dashboard
queries the `buckets` table directly and shows only the allocated amount — the view
exists but was never wired up.

**Part B — iOS Shortcut:** a second expense intake channel for quick manual entry.
A dedicated multipart upload endpoint (`POST /api/shortcut/upload`) accepts images
and PDFs from an iOS Shortcut, runs OCR, and stores the expense — same pipeline
as the Telegram webhook but simpler. The Shortcut is built in the iOS Shortcuts
app and appears in the share sheet and on the home screen.

→ `activity/phases/phase-4-shortcut.md` — full scope and constraints  
→ `activity/ToDo.md` — task breakdown
