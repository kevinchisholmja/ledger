# Database

## Applying a migration

Paste the SQL directly into:
**Supabase Dashboard → SQL Editor → New query → Run**

Project: `evdbqegscpeaabzzcwvw`

Always use `IF NOT EXISTS` in migrations so they are safe to re-run.

```bash
# Alternative: Management API (if SQL Editor is unavailable)
curl -s -X POST "https://api.supabase.com/v1/projects/evdbqegscpeaabzzcwvw/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$(cat supabase/migrations/YOUR_FILE.sql | tr '\n' ' ')\"}"
```

## Migration inventory

| File | Applied | What it does |
|------|---------|--------------|
| `20240001_ledger_phase1.sql` | ✅ | Core schema — enums, tables, buckets_summary view |
| `20240002_ledger_bank_entries_type.sql` | ✅ | match_status enum + bank_entries.type |
| `20240003_add_confirmed_category.sql` | ✅ | expenses.confirmed_category text column |
| `20240004_amount_nullable.sql` | ✅ | DROP NOT NULL on expenses.amount |
| `20240005_fix_buckets_schema.sql` | ✅ | Schema corrections |
| `20240006_add_long_budget_periods.sql` | ✅ | biennial/triennial/quinquennial/decennial periods |
| `20240007_add_bucket_group.sql` | ✅ | buckets.group_name column |
| `20240008_add_missing_bucket_columns.sql` | ✅ | icon/color/currency/group_name IF NOT EXISTS |
| `20240009_add_categories_icon.sql` | ✅ | categories.icon column |
| `20240010_categories_and_bank_accounts.sql` | ✅ | categories table + bank_accounts table |
| `20240011_add_goals.sql` | ✅ | goals table |
| `20240012_bank_account_number_notes.sql` | ✅ | bank_accounts.account_number + notes |

| `20240013_create_transactions_payees_assignments.sql` | ✅ | Create transactions, payees, budget_assignments; add categories.type + bank_accounts.on_budget |

## Upcoming migrations (Phase A3+ — do not apply yet)

| File (planned) | Phase | What it will do |
|----------------|-------|-----------------|
| `20240014_migrate_expenses_to_transactions.sql` | A3 | Copy expenses → transactions (direction=debit, type=purchase, account=Unassigned) |
| `20240015_drop_old_tables.sql` | A6 | DROP expenses, bank_entries after full migration |

## Known issues

**Port 5432 / 6543 may be blocked.**
`supabase db push` connects directly to Postgres. Some networks block these ports.
Workaround: use the Supabase Dashboard SQL Editor.

**`amount` is nullable for pending entries.**
Manual text entries and failed-OCR receipts are stored with `amount = NULL` and
`status = pending_review`. The user fills in the amount in the review UI.

**Service role bypasses RLS.**
The Drizzle client uses the service role key. Supabase row-level security provides
zero protection in application queries. Every query MUST include `WHERE user_id = X`.

**`buckets_summary` view.**
`security_invoker = true` — still requires explicit `WHERE user_id` in Drizzle queries.
No longer used in the dashboard (replaced by direct Drizzle query in Phase 5).
Do not rely on it for new features.

## Checking what's in the DB

```sql
-- List all tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Count rows per table
SELECT 'expenses' AS t, COUNT(*) FROM expenses WHERE user_id = '[your-user-id]'
UNION ALL
SELECT 'categories', COUNT(*) FROM categories WHERE user_id = '[your-user-id]'
UNION ALL
SELECT 'buckets', COUNT(*) FROM buckets WHERE user_id = '[your-user-id]'
UNION ALL
SELECT 'bank_accounts', COUNT(*) FROM bank_accounts WHERE user_id = '[your-user-id]';

-- Check enums
SELECT enum_range(NULL::budget_period);
SELECT enum_range(NULL::expense_source);
SELECT enum_range(NULL::expense_status);
```

## Phase A migration procedure (when ready)

1. **Verify current row counts** (SQL above) — record them
2. Apply `20240013` — creates new tables; verify no errors
3. Verify new tables are empty and old tables unchanged
4. Apply `20240014` — migrates data; verify row counts match
5. Run the app against new tables; verify register page shows same data
6. Only after full Phase A4 code rewrite: apply `20240015` to drop old tables
