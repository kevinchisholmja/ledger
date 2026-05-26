-- Add account_number and notes to bank_accounts
ALTER TABLE bank_accounts
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS notes text;
