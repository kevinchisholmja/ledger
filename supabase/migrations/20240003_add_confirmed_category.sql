-- ============================================================
-- Ledger — Phase 2 Amendment
-- 1. Add confirmed_category to expenses (set by user in PWA review)
-- 2. Extend expense_source enum with 'csv' (used in Phase 5 bank import)
-- Run with: supabase db push
-- ============================================================

-- Add confirmed_category column (nullable — only set after user reviews)
alter table public.expenses
  add column if not exists confirmed_category text;

-- Extend the expense_source enum for Phase 5 CSV import
-- PostgreSQL requires enum additions to be outside a transaction block;
-- supabase db push handles this correctly.
alter type expense_source add value if not exists 'csv';
