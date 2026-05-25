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

## Known patterns

- `buckets_summary` is a Postgres view with `security_invoker = true`. Drizzle service-role queries bypass RLS regardless — always add `WHERE user_id = X`.
- `pending_ocr` and `pending_review` expenses both need to appear in the review queue. `pending_ocr` items should show a "retry OCR" action.
- Confirming an expense must set both `confirmed_category` (text) AND `category_id` (UUID FK) — `buckets_summary` aggregates on `category_id`, not on `confirmed_category`.
