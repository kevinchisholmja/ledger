@../../rules/database.md

# Database Layer — Context

You are working in the database layer. `schema.ts` is the single source of truth
for all table definitions and TypeScript types.

## Current schema (Phase A2 state)

### Tables that exist in production
```
categories      — user categories (type column coming in Phase A1)
buckets         — budget envelopes
expenses        — ALL transactions (debit-only, v1 model — will become transactions in A3)
bank_entries    — imported CSV bank rows (being replaced by transactions in A6)
bank_accounts   — bank/cash accounts (extended with account_number, notes in 20240012)
goals           — multi-year savings goals
```

### Tables that do NOT exist yet (Phase A1+)
```
transactions    — v2 transaction model (replaces expenses + bank_entries)
payees          — named parties with default category/budget learning
budget_assignments — TBB → envelope flow (YNAB-style assignment)
```

## Type exports (bottom of schema.ts)
```typescript
export type Category = typeof categories.$inferSelect;
export type Bucket = typeof buckets.$inferSelect;
export type Expense = typeof expenses.$inferSelect;       // ← v1, being replaced
export type BankEntry = typeof bankEntries.$inferSelect;  // ← being dropped
export type BankAccount = typeof bankAccounts.$inferSelect;
export type Goal = typeof goals.$inferSelect;
// Phase A1+ will add:
// export type Transaction = typeof transactions.$inferSelect;
// export type Payee = typeof payees.$inferSelect;
// export type BudgetAssignment = typeof budgetAssignments.$inferSelect;
```

## Enums in the DB
```
budget_period: weekly|fortnightly|monthly|quarterly|annual|biennial|triennial|quinquennial|decennial
expense_source: telegram|shortcut|manual|csv
expense_status: pending_ocr|pending_review|confirmed|reconciled
match_status: unmatched|matched|ignored
```
These enum names will be updated in Phase A4 (`expense_source` → `transaction_source`,
`expense_status` → `transaction_status`). Do not rename them until Phase A4.

## client.ts
Do not modify `lib/db/client.ts` without a very good reason. The `prepare: false`
config is required for the Supabase transaction-mode pooler (port 6543).
