-- ============================================================
-- Ledger — Personal Finance Tracker
-- Phase 1: Schema Migration
-- Run with: supabase db push
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "pgcrypto";


-- ── Enums ───────────────────────────────────────────────────
create type budget_period as enum (
  'weekly',
  'fortnightly',
  'monthly',
  'quarterly',
  'annual'
);

create type expense_source as enum (
  'telegram',
  'shortcut',
  'manual'
);

create type expense_status as enum (
  'pending_ocr',
  'pending_review',
  'confirmed',
  'reconciled'
);

create type match_status as enum (
  'unmatched',
  'matched',
  'ignored'
);


-- ── Tables ───────────────────────────────────────────────────

-- buckets
create table public.buckets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid(),
  name             text not null,
  color            text,                          -- e.g. '#4CAF50'
  icon             text,                          -- emoji or icon slug
  period           budget_period not null,
  allocated_amount numeric(12, 2) not null check (allocated_amount >= 0),
  currency         text not null default 'JMD',
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

-- categories
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid(),
  name       text not null,
  bucket_id  uuid not null references public.buckets (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- expenses
create table public.expenses (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid(),
  merchant              text,
  amount                numeric(12, 2) not null check (amount >= 0),
  currency              text not null default 'JMD',
  date                  date not null,
  category_id           uuid references public.categories (id) on delete set null,
  bucket_id             uuid references public.buckets (id) on delete set null,
  receipt_url           text,
  notes                 text,
  source                expense_source not null default 'manual',
  status                expense_status not null default 'pending_review',
  raw_ocr_text          text,
  ai_suggested_category text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- bank_entries
create table public.bank_entries (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid(),
  statement_date      date not null,
  description         text,
  amount              numeric(12, 2) not null,   -- negative = debit
  currency            text not null default 'JMD',
  account_name        text,
  raw_row             text,
  matched_expense_id  uuid references public.expenses (id) on delete set null,
  match_status        match_status not null default 'unmatched',
  created_at          timestamptz not null default now()
);


-- ── Auto-update updated_at ───────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_expenses_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();


-- ── Indexes ──────────────────────────────────────────────────

-- expenses: primary query patterns
create index idx_expenses_user_id        on public.expenses (user_id);
create index idx_expenses_date           on public.expenses (date desc);
create index idx_expenses_status         on public.expenses (status);
create index idx_expenses_bucket_id      on public.expenses (bucket_id);
create index idx_expenses_category_id    on public.expenses (category_id);
create index idx_expenses_user_date      on public.expenses (user_id, date desc);

-- bank_entries
create index idx_bank_entries_user_id       on public.bank_entries (user_id);
create index idx_bank_entries_statement_date on public.bank_entries (statement_date desc);
create index idx_bank_entries_match_status  on public.bank_entries (match_status);

-- categories
create index idx_categories_bucket_id on public.categories (bucket_id);

-- buckets
create index idx_buckets_user_active on public.buckets (user_id, active);


-- ── Row Level Security ───────────────────────────────────────

alter table public.buckets      enable row level security;
alter table public.categories   enable row level security;
alter table public.expenses     enable row level security;
alter table public.bank_entries enable row level security;

-- buckets
create policy "buckets: owner select"
  on public.buckets for select
  using (auth.uid() = user_id);

create policy "buckets: owner insert"
  on public.buckets for insert
  with check (auth.uid() = user_id);

create policy "buckets: owner update"
  on public.buckets for update
  using (auth.uid() = user_id);

create policy "buckets: owner delete"
  on public.buckets for delete
  using (auth.uid() = user_id);

-- categories
create policy "categories: owner select"
  on public.categories for select
  using (auth.uid() = user_id);

create policy "categories: owner insert"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "categories: owner update"
  on public.categories for update
  using (auth.uid() = user_id);

create policy "categories: owner delete"
  on public.categories for delete
  using (auth.uid() = user_id);

-- expenses
create policy "expenses: owner select"
  on public.expenses for select
  using (auth.uid() = user_id);

create policy "expenses: owner insert"
  on public.expenses for insert
  with check (auth.uid() = user_id);

create policy "expenses: owner update"
  on public.expenses for update
  using (auth.uid() = user_id);

create policy "expenses: owner delete"
  on public.expenses for delete
  using (auth.uid() = user_id);

-- bank_entries
create policy "bank_entries: owner select"
  on public.bank_entries for select
  using (auth.uid() = user_id);

create policy "bank_entries: owner insert"
  on public.bank_entries for insert
  with check (auth.uid() = user_id);

create policy "bank_entries: owner update"
  on public.bank_entries for update
  using (auth.uid() = user_id);

create policy "bank_entries: owner delete"
  on public.bank_entries for delete
  using (auth.uid() = user_id);


-- ── buckets_summary view ─────────────────────────────────────
-- Shows allocated vs spent per bucket for the current calendar
-- month and the current calendar year. Respects RLS by filtering
-- on auth.uid() so each user only sees their own rows.

create or replace view public.buckets_summary
with (security_invoker = true)   -- runs as the calling user → RLS applies
as
select
  b.id                                          as bucket_id,
  b.user_id,
  b.name                                        as bucket_name,
  b.color,
  b.icon,
  b.period,
  b.allocated_amount,
  b.currency,
  b.active,

  -- ── current month ──────────────────────────────────────────
  coalesce(month_agg.total_spent, 0)            as month_spent,
  b.allocated_amount
    - coalesce(month_agg.total_spent, 0)        as month_remaining,

  -- ── current year ───────────────────────────────────────────
  coalesce(year_agg.total_spent, 0)             as year_spent,

  -- convenience: expense count this month
  coalesce(month_agg.expense_count, 0)          as month_expense_count

from public.buckets b

-- current calendar month
left join lateral (
  select
    sum(e.amount)  as total_spent,
    count(*)       as expense_count
  from public.expenses e
  where e.bucket_id = b.id
    and e.user_id   = b.user_id
    and e.status   != 'pending_ocr'      -- exclude unprocessed receipts
    and date_trunc('month', e.date::timestamptz)
        = date_trunc('month', now())
) month_agg on true

-- current calendar year
left join lateral (
  select
    sum(e.amount) as total_spent
  from public.expenses e
  where e.bucket_id = b.id
    and e.user_id   = b.user_id
    and e.status   != 'pending_ocr'
    and date_trunc('year', e.date::timestamptz)
        = date_trunc('year', now())
) year_agg on true

where b.active = true;

-- Grant to authenticated role so Supabase JS client can query it
grant select on public.buckets_summary to authenticated;
