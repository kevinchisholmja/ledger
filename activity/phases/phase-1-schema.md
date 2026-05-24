# Phase 1 — Database Schema

**Status:** Complete  
**Date:** 2026-05-24  
**Full activity log:** activity/2026/2026-05-24.md

---

## Goal

Define the complete Postgres schema before writing any application code.
All four phases of the application share this schema — getting it right first
avoids painful breaking migrations later.

---

## Scope

**In:**
- All enums, tables, views, and RLS policies for the full application lifecycle
- Applied to Supabase (remote only — no local Supabase stack)

**Out:**
- No application code in this phase
- No seed data — categories and buckets are created by the user via the UI

---

## Schema overview

```
enums
  budget_period     weekly | fortnightly | monthly | quarterly | annual
  expense_source    telegram | shortcut | manual | csv
  expense_status    pending_ocr | pending_review | confirmed | reconciled
  match_status      unmatched | matched | ignored

tables
  categories        user-defined spending categories (name, icon)
  buckets           budget envelopes (name, period, amount, optional category_id)
  expenses          the core record — every expense from any source
  bank_entries      imported bank statement rows for reconciliation (Phase 4+)

views
  buckets_summary   aggregates confirmed expense totals per bucket/category
                    security_invoker = true
```

---

## Key constraints and decisions

**`expenses.amount` is nullable.**
Manual text entries and failed-OCR receipts have no known amount at insert time.
The user fills it in during the review step. Migration 20240004 drops NOT NULL.
Any code that inserts an expense must treat amount as optional.

**`expense_source` has 4 values even though only 2 are used in Phases 1–3.**
`shortcut` and `csv` are reserved for Phase 4+. Postgres enums cannot add values
without a migration — defining them now avoids a breaking change later.

**`buckets_summary` uses `security_invoker = true`.**
This means the view respects the RLS policies of the calling user when queried
via Supabase's anon/authenticated roles. However, when Drizzle queries this view
using the service role key, RLS is bypassed regardless of this setting.
Every Drizzle query must include explicit `WHERE user_id = X`.

**`bank_entries.amount` is always positive.**
Debit and credit are distinguished by a `type` column, not by sign.
This avoids ambiguity when importing bank statements with varying sign conventions.

---

## Migrations

| File | Content |
|---|---|
| 20240001 | All four enums |
| 20240002 | categories, buckets, expenses, bank_entries tables |
| 20240003 | buckets_summary view + RLS policies |
| 20240004 | Drop NOT NULL on expenses.amount |

---

## Outcome

Full schema live in Supabase. Verified via dashboard table view.
No application code yet. Schema stable — no further migrations in Phases 2 or 3.
