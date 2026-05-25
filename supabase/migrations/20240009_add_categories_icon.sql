-- categories.icon was in the Drizzle schema but absent from the live DB.
-- Drizzle's SELECT includes all schema columns, so missing it crashes /budgets.
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon text;
