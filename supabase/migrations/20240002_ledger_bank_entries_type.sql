-- ============================================================
-- Ledger — Phase 1 Amendment
-- bank_entries: explicit type column + positive amount constraint
-- Run with: supabase db push
-- ============================================================

-- Add entry type (debit | credit), always positive amounts
alter table public.bank_entries
  add column type text not null default 'debit'
    check (type in ('debit', 'credit'));

-- Enforce positive-only amounts (removes implicit negative convention)
alter table public.bank_entries
  add constraint bank_entries_amount_positive check (amount >= 0);

-- Index: reconciliation queries will almost always filter by type
create index idx_bank_entries_type on public.bank_entries (type);
