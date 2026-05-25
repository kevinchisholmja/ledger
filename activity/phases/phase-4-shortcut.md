# Phase 4 — buckets_summary + iOS Shortcut

**Status:** Scoped — not yet started  
**Date scoped:** 2026-05-24  
**Activity log:** activity/2026/ (to be created when work begins)

---

## Goal

Two things that make the app genuinely useful on a daily basis:

1. **Wire `buckets_summary` to the dashboard** — budget cards currently show only
   the allocated amount. The view already exists in the DB with month_spent,
   month_remaining, year_spent, month_expense_count. This is the most important
   missing piece: the dashboard is the hero screen and without spend data the budget
   cards are useless shells.

2. **iOS Shortcut** — a second expense intake channel for quick manual entry.
   Telegram is the primary intake for receipts. The Shortcut is for cash purchases
   and quick logging when you don't have a receipt to photograph. Appears in the
   iOS share sheet and on the home screen. Logs amount + merchant in under 10 seconds.

---

## Scope

**In:**
- Dashboard redesign: `buckets_summary` wired up, Copilot-style progress bar cards
  (spent / remaining / progress bar / year spent), sorted over-budget first
- `lib/format.ts` usage throughout — replace all inline `J$${...}` formatting
- `POST /api/shortcut/upload` — multipart image/PDF upload, OCR, expense insert
- `SHORTCUT_SECRET` env var for auth (same pattern as `TELEGRAM_WEBHOOK_SECRET`)
- `docs/ios-shortcut.md` — step-by-step Shortcut setup guide for iPhone
- `CLAUDE.md` update with Phase 4 additions

**Out:**
- Changes to the review, transactions, or budgets pages (those are design/P5 work)
- Changes to the Telegram webhook
- Bank CSV import (Phase 5)
- Analytics charts (Phase 6)
- Category seeding UI — already built in `/budgets`, just needs to be used

---

## Key constraints

- `buckets_summary` is a Postgres view — query with `db.execute(sql\`...\`)`,
  not a Drizzle table query. Returns Postgres numeric values as strings.
- The shortcut endpoint uses `supabaseAdmin` for storage and DB inserts (same
  pattern as the Telegram webhook), not Drizzle — keep server-side inserts consistent.
- `source = 'shortcut'` is already a valid `expense_source` enum value from migration
  20240001 — no schema change needed.
- Multipart body parsed via `request.formData()` — no third-party library.
- Design direction: Copilot Money is the north star. Budget cards must show
  progress bars coloured by spend level (green <80%, amber 80–99%, red 100%+).
  See `design-reference/` for screenshots.

---

## Why this scope

The `buckets_summary` fix was originally a P3 gap (the brief specified it but
the implementation queried the `buckets` table directly instead of the view).
Adding it as the first task of P4 rather than patching P3 keeps P3 closed and
gives the redesign a clean context alongside the Copilot-style UI changes.

The iOS Shortcut was always the planned P4 feature. The endpoint is a simpler
version of the Telegram webhook (no Telegram API calls, no file download step —
the file comes in the request body directly). The Shortcut itself is built in
the iOS Shortcuts app, not in code.

Category seeding is not a build task. The `/budgets` page already has inline
add-category UI. The user seeds categories manually before the category_id
matching in the review flow will work.

---

## War Room brief

The full implementation brief is in the conversation from 2026-05-24. Parts:
- **A** — `buckets_summary` dashboard wiring + card redesign
- **B** — `POST /api/shortcut/upload` endpoint
- **C** — `docs/ios-shortcut.md` setup guide
- **D** — `CLAUDE.md` update
