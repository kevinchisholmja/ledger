-- Add user-defined group name to budgets.
-- Groups are free-text labels (e.g. "Bills", "Needs", "Wants", "Savings").
-- Existing budgets default to "Uncategorized".
ALTER TABLE buckets ADD COLUMN IF NOT EXISTS group_name text NOT NULL DEFAULT 'Uncategorized';
