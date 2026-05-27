-- Phase A1 — Create v2 tables alongside existing ones
-- No existing data is touched. App remains fully functional on the old tables.
-- Apply via: Supabase Dashboard → SQL Editor → project evdbqegscpeaabzzcwvw

-- ─── payees ──────────────────────────────────────────────────────────────────
-- Must be created before transactions, which references this table.

CREATE TABLE IF NOT EXISTS payees (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL,
  name                  text NOT NULL,
  sub_name              text,
  default_category_id   uuid REFERENCES categories(id),
  default_bucket_id     uuid REFERENCES buckets(id),
  created_at            timestamptz DEFAULT now()
);

-- ─── transactions ────────────────────────────────────────────────────────────
-- v2 transaction model. Replaces expenses + bank_entries in Phase A3+.
-- account_id is NOT NULL — migrated rows use an "Unassigned" sentinel account.

CREATE TABLE IF NOT EXISTS transactions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL,
  account_id              uuid NOT NULL REFERENCES bank_accounts(id),

  direction               text NOT NULL,
  -- 'debit' | 'credit'

  type                    text NOT NULL,
  -- 'purchase' | 'income' | 'transfer_out' | 'transfer_in'
  -- 'refund' | 'chargeback' | 'bank_fee' | 'interest' | 'opening_balance'

  amount                  numeric(12,2) NOT NULL,
  -- always positive; direction carries the sign

  currency                text NOT NULL DEFAULT 'JMD',

  -- Two dates: cash basis uses date, accrual uses invoice_date
  date                    text NOT NULL,   -- paid/settlement date (YYYY-MM-DD)
  invoice_date            text,            -- obligation/invoice date (optional)

  -- Parties
  payee_id                uuid REFERENCES payees(id),
  payee_name              text,            -- denormalized for display + search

  -- Classification
  category_id             uuid REFERENCES categories(id),
  bucket_id               uuid REFERENCES buckets(id),

  -- References
  reference_num           text,
  memo                    text,
  notes                   text,

  -- Reconciliation
  cleared                 boolean NOT NULL DEFAULT false,
  reconciled              boolean NOT NULL DEFAULT false,

  -- Relationships (self-referencing)
  transfer_pair_id        uuid REFERENCES transactions(id),          -- links both sides of a transfer
  original_transaction_id uuid REFERENCES transactions(id),          -- refund/chargeback origin

  -- Media
  receipt_url             text,

  -- Provenance
  source                  text NOT NULL DEFAULT 'manual',
  -- 'manual' | 'telegram' | 'shortcut' | 'csv'

  status                  text NOT NULL DEFAULT 'confirmed',
  -- 'pending_ocr' | 'pending_review' | 'confirmed'

  -- Accountant flag: one-tap mark + notes explain why; visible in /reports
  flagged                 boolean NOT NULL DEFAULT false,

  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

-- ─── budget_assignments ───────────────────────────────────────────────────────
-- YNAB-style TBB → envelope flow. One row per bucket per month.
-- TBB = SUM(income credits ever) − SUM(all assignments ever)

CREATE TABLE IF NOT EXISTS budget_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  bucket_id   uuid NOT NULL REFERENCES buckets(id),
  month       text NOT NULL,           -- 'YYYY-MM'
  amount      numeric(12,2) NOT NULL,  -- amount assigned to this envelope this month
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, bucket_id, month)   -- one assignment row per envelope per month
);

-- ─── categories — add type column ────────────────────────────────────────────
ALTER TABLE categories ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'expense';
-- 'expense' | 'income'
-- All existing rows default to 'expense'. Income presets added by app seed.

-- ─── bank_accounts — add on_budget column ────────────────────────────────────
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS on_budget boolean NOT NULL DEFAULT true;
-- true  = on-budget (checking, savings, cash) — cash feeds TBB
-- false = off-budget (liabilities, investments) — tracked for net worth only
--         transfers TO off-budget accounts must consume a category + envelope
