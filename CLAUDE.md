@AGENTS.md

# Ledger — Project Rules for AI Agents

## Stack facts (do not assume — read these)

- Next.js version: **16.2.6** (NOT 14). Check `node_modules/next/package.json` before writing any Next.js-specific code.
- Tailwind: **v4**. Import syntax is `@import "tailwindcss"` — NOT `@tailwind base/components/utilities`.
- Database client: **Drizzle ORM** with `postgres` driver. NOT Supabase JS for queries.
- Auth/Storage: **Supabase JS** only for auth sessions and storage uploads.
- Postgres connection: port **6543** (transaction mode pooler) — requires `prepare: false` in the postgres client config.

## Security rules

- Every Drizzle query MUST include explicit `WHERE user_id = [authenticated user id]` — service role bypasses RLS entirely.
- Never use the anon Supabase client for server-side DB queries.

## Package requirements

- `@supabase/ssr` is required for middleware auth in App Router — not just `@supabase/supabase-js`.
- Drizzle packages: `drizzle-orm`, `postgres` (runtime); `drizzle-kit` (dev only).

## Schema facts

- `expenses.amount` is nullable (migration 20240004 dropped NOT NULL) — Drizzle schema must NOT use `.notNull()` on this column.
- `expense_source` enum has values: `telegram`, `shortcut`, `manual`, `csv` — all four must be in the schema.
- Supabase Storage bucket is named `receipts`. Upload paths must NOT include `receipts/` prefix — the bucket name is already in the URL.

## Naming conventions (P3.5 — do not revert)

- UI uses **"budget/budgets"** (not bucket) and **"transaction/transactions"** (not expense).
- Routes: `/budgets`, `/transactions`, `/api/budgets`, `/api/budgets/[id]`.
- DB tables remain `buckets` and `expenses` — do not rename them.
- Primary accent colour is **`blue-600` (`#2563EB`)** — no `indigo` anywhere in the codebase.
- Currency formatting: always use `formatJMD()` or `formatCurrency()` from `lib/format.ts` — never inline `Intl.NumberFormat` or `J$${...}`.

## Known patterns

- `buckets_summary` is a Postgres view with `security_invoker = true`. Drizzle service-role queries bypass RLS regardless — always add `WHERE user_id = X`.
- `pending_ocr` and `pending_review` expenses both need to appear in the review queue. `pending_ocr` items should show a "retry OCR" action.
- Confirming an expense must set both `confirmed_category` (text) AND `category_id` (UUID FK) — `buckets_summary` aggregates on `category_id`, not on `confirmed_category`.
- Confirming an expense should also set `bucket_id` — this is how `buckets_summary` counts month_spent. Without it all budget cards show $0.

## Phase 4 additions (P4 — 2026-05-24)

- `expenses.bucket_id` (UUID FK → buckets) was added to the Drizzle schema. The PATCH route at `app/api/expenses/[id]/route.ts` now accepts `bucket_id`.
- ReviewCard now has a Budget dropdown — it saves `bucket_id` alongside `category_id` when confirming.
- iOS Shortcut endpoint: `POST /api/shortcut/upload` — multipart form-data, auth via `x-shortcut-secret` header matching `SHORTCUT_SECRET` env var. Source = `shortcut`.
- `docs/ios-shortcut.md` — step-by-step Shortcut setup guide.

## Phase 5 additions (P5 — 2026-05-25)

### UI redesign
- Dark navy sidebar (`bg-[#1B1F3B]`) replacing white sidebar — YNAB-style.
- 3-column layout on md+: navy sidebar | center content | white right summary panel (sticky, `w-72`).
- Full-width status banner above center content — green (`bg-emerald-600`) when under budget, blue (`bg-blue-600`) when within 80–99%, red (`bg-red-600`) when over.
- Login page: split layout, Google OAuth primary CTA, magic link secondary.
- Light theme across all pages: `bg-gray-50` page, white cards, `border-gray-200`.

### Period view selector
- `lib/period.ts` — shared (non-client) module holding `ViewPeriod` type, `isValidViewPeriod()`, `BUDGET_PERIOD_DAYS`, `VIEW_PERIOD_DAYS`. Must NOT be a client component — server pages import from here.
- Dashboard (`app/page.tsx`) accepts `?period=week|fortnight|month|quarter|year` via `searchParams`. Defaults to `month`.
- `app/components/PeriodSelector.tsx` — `"use client"` dropdown that pushes `?period=X` to the URL. Imports `ViewPeriod` from `lib/period.ts`.
- **`buckets_summary` view is no longer used in the dashboard.** Replaced by a direct Drizzle query on `buckets` + `expenses` with a dynamic date range, so spending aggregates correctly for any period window.
- Pro-rating formula: `proratedAmount = budget.amount × (viewDays / nativeBudgetDays)`. Activity = SUM of expenses in the date window for that bucket. Available = proratedAmount − activity.
- Fortnight anchor: days 1–14 = first half, days 15–end = second half of the month.
- Quarter ranges: Q1=Jan–Mar, Q2=Apr–Jun, Q3=Jul–Sep, Q4=Oct–Dec.

### Long-horizon budget periods
- `budget_period` enum extended with: `biennial` (2yr), `triennial` (3yr), `quinquennial` (5yr), `decennial` (10yr).
- Migration: `supabase/migrations/20240006_add_long_budget_periods.sql` — run once in Supabase Dashboard SQL editor if not yet applied.
- `BudgetsClient.tsx` PERIODS array updated with human-readable labels for all period types.
- When a budget's native period differs from the view window, the budget row subtitle shows the native amount and period (e.g. `$50,000 / monthly`) so the user understands the pro-rating.

### Plan page (P5 — 2026-05-25)
- Route: `/plan` — YNAB-style monthly budget planning view.
- `app/plan/page.tsx` — server component. Accepts `?month=YYYY-MM`, queries `buckets` + `expenses`, pro-rates all periods to monthly (`nativeAmount × AVG_MONTH_DAYS / nativePeriodDays`), groups by `group_name`, passes `PlanGroup[]` to `PlanClient`.
- `app/plan/PlanClient.tsx` — client component. 3-column layout (same navy sidebar), month navigator (`‹ May 2026 ›`), status banner, YNAB-style table: CATEGORY | ASSIGNED | ACTIVITY | AVAILABLE. Collapsible groups. Inline ASSIGNED editing: click → input → back-calculates native amount → `PATCH /api/budgets/:id` → `router.refresh()`.
- Back-calculate formula: `newNativeAmount = editedMonthly × (nativePeriodDays / AVG_MONTH_DAYS)`.
- `app/api/budgets/rename-group/route.ts` — `PATCH {oldName, newName}` renames all buckets in a group for the user.
- `BudgetsClient` accepts `defaultGroup` prop — Plan page "Add budget to [Group]" links pass `?group=X`.

### Budget groups
- `group_name text NOT NULL DEFAULT 'Uncategorized'` on `buckets` table.
- Migration: `supabase/migrations/20240007_add_bucket_group.sql` — must be applied in Supabase Dashboard SQL editor.

### Missing columns catch-up (2026-05-25)
- `icon`, `color`, `currency` were in the original schema but may be absent in live DBs set up via the Supabase dashboard UI.
- Migration: `supabase/migrations/20240008_add_missing_bucket_columns.sql` — adds all four potentially missing columns (`icon`, `color`, `currency`, `group_name`) with `IF NOT EXISTS`. Run this instead of 20240007 if both are pending.
- `categories.icon` — added via migration 20240009. Applied to production DB directly.

### Categories management (2026-05-25)
- Budgets page (`/budgets`) now has two tabs: **Budgets** and **Categories**.
- Categories are used for expense classification in the review flow (separate from budget groups).
- API: `POST /api/categories` (create), `DELETE /api/categories/[id]` (delete), `GET /api/categories` (list).
- ReviewCard category field is now a text `<input>` with `<datalist>` suggestions — users can type new categories or pick existing ones.

### All Accounts page (2026-05-25)
- Route: `/accounts` — YNAB-style ledger showing all expenses.
- Server component queries all expenses + buckets, groups by date.
- Desktop table: Date | Payee | Budget | Category | Source | Outflow.
- Added to nav sidebar (icon ⬡) across Dashboard, Plan, and Accounts pages.
