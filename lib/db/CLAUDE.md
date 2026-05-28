@../../rules/database.md

# Database Layer — Context

You are working in the database layer. `schema.ts` is the single source of truth
for all table definitions and TypeScript types.

## Current schema (Phase A6 complete)

### Tables that exist in production
```
categories         — user categories (type: 'expense' | 'income')
buckets            — budget envelopes (stays as 'buckets' permanently)
bank_accounts      — bank/cash accounts
goals              — multi-year savings goals
payees             — named parties with default category/budget (Phase A1)
transactions       — v2 transaction model — the only transaction table
budget_assignments — TBB → envelope flow, one row per bucket per month
```

### Key column additions (Phase A1)
- `categories.type` — `'expense' | 'income'`, default `'expense'`
- `bank_accounts.on_budget` — `boolean`, default `true`
- `transactions.flagged` — `boolean`, default `false` (accountant review flag)
- `transactions.direction` — `'debit' | 'credit'`
- `transactions.invoice_date` — accrual date (optional, cash basis uses `date`)

## Type exports (bottom of schema.ts)

```typescript
export type Category = typeof categories.$inferSelect;
export type Bucket = typeof buckets.$inferSelect;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Payee = typeof payees.$inferSelect;
export type NewPayee = typeof payees.$inferInsert;
export type BudgetAssignment = typeof budgetAssignments.$inferSelect;
export type NewBudgetAssignment = typeof budgetAssignments.$inferInsert;
```

## Enums in the DB
```
budget_period: weekly|fortnightly|monthly|quarterly|annual|biennial|triennial|quinquennial|decennial
```
The old `expense_source`, `expense_status`, and `match_status` enums were dropped in Phase A6.

## Phase A is complete

`expenses` and `bank_entries` are dropped. All data lives in `transactions`.
Write all new features against `transactions`.

## client.ts
Do not modify `lib/db/client.ts` without a very good reason. The `prepare: false`
config is required for the Supabase transaction-mode pooler (port 6543).
