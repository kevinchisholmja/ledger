@../../rules/database.md

# Database Layer — Context

You are working in the database layer. `schema.ts` is the single source of truth
for all table definitions and TypeScript types.

## Current schema (Phase A4 complete)

### Tables that exist in production
```
categories        — user categories (type column: 'expense' | 'income', added Phase A1)
buckets           — budget envelopes
expenses          — ALL transactions (debit-only, v1 model — replaced by transactions in A3)
bank_entries      — imported CSV bank rows (replaced by transactions in A6)
bank_accounts     — bank/cash accounts (on_budget column added Phase A1)
goals             — multi-year savings goals
payees            — named parties with default category/budget learning (Phase A1)
transactions      — v2 transaction model (Phase A1 — empty until A3 migration)
budget_assignments — TBB → envelope flow, one row per bucket per month (Phase A1)
```

### Key column additions (Phase A1)
- `categories.type` — `'expense' | 'income'`, default `'expense'`
- `bank_accounts.on_budget` — `boolean`, default `true`
- `transactions.flagged` — `boolean`, default `false` (accountant review flag)
- `transactions.direction` — `'debit' | 'credit'`
- `transactions.invoice_date` — accrual date (optional, cash basis uses `date`)

## Type exports (bottom of schema.ts)

### v1 types (current — being replaced in Phase A3+)
```typescript
export type Category = typeof categories.$inferSelect;
export type Bucket = typeof buckets.$inferSelect;
export type Expense = typeof expenses.$inferSelect;       // ← being replaced
export type BankEntry = typeof bankEntries.$inferSelect;  // ← being dropped
export type BankAccount = typeof bankAccounts.$inferSelect;
export type Goal = typeof goals.$inferSelect;
```

### v2 types (Phase A1+)
```typescript
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Payee = typeof payees.$inferSelect;
export type NewPayee = typeof payees.$inferInsert;
export type BudgetAssignment = typeof budgetAssignments.$inferSelect;
export type NewBudgetAssignment = typeof budgetAssignments.$inferInsert;
```

## Enums in the DB
```
budget_period:  weekly|fortnightly|monthly|quarterly|annual|biennial|triennial|quinquennial|decennial
expense_source: telegram|shortcut|manual|csv       ← renamed to transaction_source in Phase A4
expense_status: pending_ocr|pending_review|confirmed|reconciled ← renamed in Phase A4
match_status:   unmatched|matched|ignored
```
Do NOT rename the `expense_*` enums until Phase A4.

## Phase A transition (current state)

| Table | Phase | Status |
|-------|-------|--------|
| `expenses` | v1 | Truncated (no data) — all app code now reads `transactions` |
| `transactions` | v2 | **Active** — all new inserts and reads go here (Phase A4 complete) |
| `bank_entries` | v1 | Truncated (no data) — will be dropped in Phase A6 |
| `buckets` | v1+v2 | Keep permanently |
| `categories` | v1+v2 | Extended with `type` column (Phase A1) |
| `bank_accounts` | v1+v2 | Extended with `on_budget` column (Phase A1) |
| `payees` | v2 | Created (Phase A1) — empty until Phase A5 |
| `budget_assignments` | v2 | Created (Phase A1) — empty until Phase A5 |

All new features must be written against `transactions`. Do NOT write against `expenses`.

## client.ts
Do not modify `lib/db/client.ts` without a very good reason. The `prepare: false`
config is required for the Supabase transaction-mode pooler (port 6543).
