-- categories.bucket_id: drop NOT NULL so categories can exist standalone
ALTER TABLE public.categories ALTER COLUMN bucket_id DROP NOT NULL;

-- bank_accounts: track linked bank/cash accounts with starting balances
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  name        text NOT NULL,
  type        text NOT NULL DEFAULT 'checking',
  balance     numeric(12,2) NOT NULL DEFAULT 0,
  currency    text NOT NULL DEFAULT 'JMD',
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
