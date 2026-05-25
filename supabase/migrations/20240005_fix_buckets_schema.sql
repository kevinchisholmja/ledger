-- Fix buckets table to match Drizzle schema
-- allocated_amount was renamed to amount; category_id and updated_at were missing

alter table public.buckets rename column allocated_amount to amount;

alter table public.buckets
  add column if not exists category_id uuid references public.categories(id);

alter table public.buckets
  add column if not exists updated_at timestamptz default now();

-- Recreate buckets_summary view with renamed column
drop view if exists public.buckets_summary;

create view public.buckets_summary
with (security_invoker = true)
as
select
  b.id                                          as bucket_id,
  b.user_id,
  b.name                                        as bucket_name,
  b.color,
  b.icon,
  b.period,
  b.amount,
  b.currency,
  b.active,

  coalesce(month_agg.total_spent, 0)            as month_spent,
  b.amount - coalesce(month_agg.total_spent, 0) as month_remaining,

  coalesce(year_agg.total_spent, 0)             as year_spent,
  coalesce(month_agg.expense_count, 0)          as month_expense_count

from public.buckets b

left join lateral (
  select sum(e.amount) as total_spent, count(*) as expense_count
  from public.expenses e
  where e.bucket_id = b.id
    and e.user_id   = b.user_id
    and e.status   != 'pending_ocr'
    and date_trunc('month', e.date::timestamptz) = date_trunc('month', now())
) month_agg on true

left join lateral (
  select sum(e.amount) as total_spent
  from public.expenses e
  where e.bucket_id = b.id
    and e.user_id   = b.user_id
    and e.status   != 'pending_ocr'
    and date_trunc('year', e.date::timestamptz) = date_trunc('year', now())
) year_agg on true

where b.active = true;

grant select on public.buckets_summary to authenticated;
