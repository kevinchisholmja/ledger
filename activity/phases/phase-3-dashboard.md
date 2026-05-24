# Phase 3 — Drizzle ORM, Auth, PWA Dashboard

**Status:** Complete  
**Date:** 2026-05-24  
**Full activity log:** activity/2026/2026-05-24b.md

---

## Goal

Replace the ad-hoc Supabase JS queries in the webhook route with Drizzle ORM so the
schema lives in the repo as TypeScript. Add Supabase SSR auth so the dashboard is
protected. Build the full PWA UI: login, dashboard overview, review queue, expense
list, and budget manager. Make it installable on iPhone as a home screen app.

---

## Scope

**In:**
- Drizzle ORM + postgres driver, replacing all direct Supabase JS DB queries
- `@supabase/ssr` auth for Next.js App Router (Server Components + Route Handlers)
- Magic-link email login (no passwords)
- Dashboard: pending count, budget cards, recent expenses
- Review queue: edit all fields, confirm, retry OCR, delete
- Expense list: full history grouped by date
- Budget manager: create and delete budget buckets
- PWA manifest, icons, viewport meta for iPhone install
- API routes for all CRUD operations

**Out:**
- Budget vs. actual spending comparison (requires buckets_summary aggregation — Phase 4+)
- CSV import for bank statements (Phase 4+)
- Categories management UI (categories created via API only for now)
- Push notifications

---

## Files created

```
lib/db/client.ts                       Drizzle client — postgres driver, prepare:false
lib/db/schema.ts                       TypeScript schema mirroring all 4 migrations
lib/ocr.ts                             Extracted from webhook route, shared by retry-ocr
lib/supabase/server.ts                 createSupabaseServerClient() for server-side use
lib/supabase/middleware.ts             updateSession() for proxy.ts
lib/auth.ts                            requireUser() — redirects to /login if no session
proxy.ts                               Route protection (renamed from middleware.ts)
drizzle.config.ts                      Points to lib/db/schema.ts

app/api/auth/callback/route.ts         Magic-link code exchange
app/api/expenses/[id]/route.ts         PATCH + DELETE
app/api/expenses/[id]/retry-ocr/route.ts  Re-runs OCR on stored receipt image
app/api/buckets/route.ts               GET + POST
app/api/buckets/[id]/route.ts          PATCH + DELETE
app/api/categories/route.ts            GET + POST

app/login/page.tsx                     Magic-link email form
app/page.tsx                           Dashboard (server component)
app/review/page.tsx                    Review queue (server component)
app/review/ReviewCard.tsx              Per-expense edit/confirm form (client component)
app/expenses/page.tsx                  Full expense list
app/buckets/page.tsx                   Budget manager (server component)
app/buckets/BucketsClient.tsx          Create/delete form (client component)
app/manifest.ts                        PWA web app manifest
app/error.tsx, app/loading.tsx         Global error + loading boundaries
app/review/error.tsx, loading.tsx      Per-route boundaries
app/expenses/error.tsx, loading.tsx
app/buckets/error.tsx, loading.tsx
public/icon-192.png, icon-512.png      Placeholder PWA icons (replace with real ones)
```

---

## Key decisions

**Drizzle ORM over Supabase JS client for all DB queries.**
Drizzle keeps the schema in the repo as TypeScript. Type errors at compile time
catch mismatches between the schema and queries. Supabase JS is retained only for
auth session management and Storage uploads — what it does well.

**`prepare: false` is non-negotiable for the pooler.**
The Supabase transaction-mode pooler (port 6543) does not maintain prepared statement
state between connections. Omitting `prepare: false` causes runtime errors under
any concurrency. This is set in lib/db/client.ts and must never be removed.

**Every Drizzle query includes explicit `WHERE user_id = X`.**
The service role key bypasses RLS entirely. There is no database-level safety net.
This is a hard rule enforced in CLAUDE.md — any query missing this filter would
expose one user's data to another if multi-tenancy is ever added.

**`category_id` set only on exact name match — never auto-create.**
When confirming an expense, the UI matches the selected category name against the
categories table. If no exact match exists, `category_id` is null. This prevents
phantom categories from accumulating. The user explicitly creates categories first.

**`confirmed_category` (text) AND `category_id` (UUID) both set on confirm.**
`buckets_summary` aggregates on `category_id`. If only `confirmed_category` is set,
the spending totals in the dashboard will be wrong. Both fields must be updated
together when confirming an expense.

**Both `pending_ocr` and `pending_review` appear in the review queue.**
`pending_ocr` items show a "Retry OCR" button. `pending_review` items show the
pre-filled form from the OCR result. Neither is hidden from the user.

**Magic-link auth only — no passwords.**
`signInWithOtp` sends an email link. No password storage, no reset flows, no 2FA
complexity. Appropriate for a single-user personal app.

---

## Bugs encountered

1. **`middleware.ts` deprecated in Next.js 16** — renamed to `proxy.ts`, export
   renamed from `middleware` to `proxy`.
   → see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md

2. **Manifest icon purpose `"any maskable"`** — not a valid TypeScript enum value.
   Fixed to `"maskable"`.

3. **Drizzle PATCH route type error** — `Partial<Record<AllowedKey, unknown>>` not
   assignable to Drizzle set() parameter. Fixed to `Partial<NewExpense>` /
   `Partial<NewBucket>` with explicit cast for the assignment loop.

---

## Outcome

Full PWA deployed to https://ledger-gules-seven.vercel.app  
Auth-protected. Installable on iPhone via Safari → Add to Home Screen.  
Complete expense lifecycle: Telegram → OCR → review → confirm → history.
