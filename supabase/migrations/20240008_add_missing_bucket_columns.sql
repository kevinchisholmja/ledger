-- Catch-up migration: add columns that exist in the Drizzle schema but may be
-- absent from the live DB if the initial migration was partially applied.
-- All statements use IF NOT EXISTS / DO blocks so they are safe to re-run.

-- icon (emoji or slug — was in original schema but may have been missed)
ALTER TABLE public.buckets
  ADD COLUMN IF NOT EXISTS icon text;

-- color (hex string — was in original schema)
ALTER TABLE public.buckets
  ADD COLUMN IF NOT EXISTS color text;

-- currency (default JMD — was in original schema)
ALTER TABLE public.buckets
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'JMD';

-- group_name (user-defined planning group — added Phase 5)
ALTER TABLE public.buckets
  ADD COLUMN IF NOT EXISTS group_name text NOT NULL DEFAULT 'Uncategorized';
