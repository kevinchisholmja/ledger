-- Allow NULL amount on expenses.
-- Manual text entries and failed-OCR receipts don't have a known amount
-- at insert time; the user fills it in during review.
-- The existing check (amount >= 0) still applies to non-null values.
alter table public.expenses alter column amount drop not null;
