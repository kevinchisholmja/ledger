-- Add long-horizon budget period types.
-- PostgreSQL allows adding enum values without a table rewrite (Postgres 9.1+).
ALTER TYPE budget_period ADD VALUE IF NOT EXISTS 'biennial';       -- 2 years
ALTER TYPE budget_period ADD VALUE IF NOT EXISTS 'triennial';      -- 3 years
ALTER TYPE budget_period ADD VALUE IF NOT EXISTS 'quinquennial';   -- 5 years
ALTER TYPE budget_period ADD VALUE IF NOT EXISTS 'decennial';      -- 10 years
