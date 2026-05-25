CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text,
  target_amount numeric(14,2) NOT NULL,
  target_date text NOT NULL,
  monthly_allocation numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'JMD',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own goals" ON goals
  FOR ALL USING (auth.uid() = user_id);
