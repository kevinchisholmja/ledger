# Ledger — Master Project Specification

> **Living document.** Update this file whenever a major decision is made, a phase
> completes, or the data model changes. Every section has a "Last updated" tag.
> Ground-level detail lives in `activity/2026/`. This file is the 40,000-foot truth.

---

## 1. Vision & Philosophy

Ledger is a personal finance PWA for a single user in Jamaica (JMD primary currency).
It is not a bank aggregator — Jamaica's banking ecosystem has no open APIs. Instead,
every transaction enters through one of three manual channels: Telegram bot (photo/PDF
of receipt), iOS Shortcut (share sheet), or web upload (browser FAB). The AI extracts
structured data from receipts so the user never types amounts manually.

**Design philosophy:**
- **"It is a pure record of what happened."** The transaction ledger is the source of
  truth. Everything else (budgets, plans, goals) is analysis layered on top.
- **Register-first, budget-overlay.** Think Quicken (what happened) with a YNAB-style
  planning layer (what will happen). The register never lies; the budget helps you think.
- **No free-text categories.** Budget and Category must always come from their
  respective DB tables. The AI picks from your list; it never invents.
- **Strict > flexible.** Dropdowns over text inputs. UUIDs over names. Constraints
  in the database, not just in the UI.

---

## 2. What Has Been Built (Phases 1–6)

### Phase 1 — Database Schema · *Complete · 2026-05-24*
Core Postgres schema via four migrations. Tables: `buckets`, `expenses`, `categories`,
`bank_entries`. View: `buckets_summary` (security_invoker=true). Key constraint:
`expenses.amount` is nullable (unknown at insert time for OCR failures).

### Phase 2 — Telegram Webhook + Claude Vision OCR · *Complete · 2026-05-24*
Data ingestion pipeline. Telegram bot → receipt photo or PDF → Supabase Storage →
Claude Vision → structured data → `expenses` insert. Three message types: compressed
photo, document (PDF/raw image), plain text. OCR failures stored as `pending_ocr`
for user retry.

### Phase 3 — Auth + Drizzle ORM + PWA Dashboard · *Complete · 2026-05-24*
Replaced ad-hoc Supabase JS queries with Drizzle ORM. Supabase SSR auth: magic link
+ Google OAuth. Four routes live: dashboard, review queue, transaction list, budget
manager. Full end-to-end flow: Telegram → OCR → review → confirm → history.

### Interlude — Terminology Refactor · *Complete · 2026-05-24*
- UI vocabulary: "bucket" → "budget", "expense" → "transaction"
- Routes: `/buckets` → `/budgets`, `/expenses` → `/transactions`
- Colour: `indigo-*` → `blue-600` (#2563EB) — zero indigo references remain
- `lib/format.ts` added: `formatJMD()`, `formatCurrency()` — no inline Intl.NumberFormat

### Phase 4 — iOS Shortcut + Budget/Category FK Refactor · *Complete · 2026-05-25*
iOS Shortcut endpoint (`POST /api/shortcut/upload`, auth via `x-shortcut-secret`).
Budget forms now link to `categories` table via `category_id` FK instead of free-text
`group_name`. Separate `/budgets` and `/categories` routes (no tabs). `bucket_id`
added to `expenses` — required for budget spend aggregation.

### Phase 5 — Dashboard Redesign + Period Selector + Plan Page · *Complete · 2026-05-25*
Dark navy sidebar (`bg-[#1B1F3B]`). Period view selector (`week|fortnight|month|
quarter|year`) with pro-rated budgets. `buckets_summary` view retired from dashboard.
Plan page (`/plan`): YNAB-style monthly budget table with inline editing and
back-calculation. Goals page (`/goals`): multi-year savings goals. Long-horizon budget
periods added (biennial → decennial).

### Phase 6 — Mobile Nav + Web Upload + Transaction Editing · *Complete · 2026-05-25*
`MobileNav.tsx`: bottom tab bar + slide-up drawer, pending badge, safe-area aware.
`UploadButton.tsx`: floating FAB, hidden on `/login`. All transactions editable with
strict dropdowns (no free text). `TransactionModal.tsx`: full-screen modal for editing
all transaction fields. List-grounded AI OCR: Claude receives user's actual category
and budget IDs; returns UUIDs directly. Preset seeding: 30 categories + 25 budgets
auto-seeded on first visit.

### Phase 6b — Bank Account Fields · *Complete · 2026-05-26*
`bank_accounts` table extended with `account_number` and `notes` columns (migration
20240012). Account rows now click-to-edit inline with all fields. Create form updated.

### Phase 6c — Spreadsheet Analysis + Architecture Decision · *Complete · 2026-05-26*
Reviewed existing Google Sheets financial ledger (multi-account Quicken-style register).
Identified that `expenses` (debit-only) cannot model income, chargebacks, refunds,
transfers, bank fees, or interest. Decision: rebuild as YNAB + Quicken hybrid.
Full spec documented in `docs/SPEC.md` (this file).

### Phase 6d — Master SPEC + Transaction Register · *Complete · 2026-05-26*
`docs/SPEC.md` created — living master specification. `/register` page added —
Quicken-style account register table mirroring the Google Sheets layout. 14 columns:
Account · Paid Date · Invoice Date · Ref # · Payee · Category · Budget · Memo · Mode
· Clr · DEBIT · CREDIT · Balance · Receipt. Phase A2 placeholder columns show `─`
until Phase A3 populates them. All 9 sidebars updated to include Register.

### Phase 7 — Documentation + Configuration Overhaul · *Complete · 2026-05-27*
`rules/` directory (5 concern-scoped files: code-style, security, api-conventions,
database, ui-standards). `CLAUDE.md` overhauled to a lean orchestrator importing all
rule files via `@`. Subdirectory `CLAUDE.md` files in `app/api/` and `lib/db/` for
context-scoped AI loading. `.claude/settings.json` with deny-list (force-push,
DROP TABLE, rm -rf, vercel --prod), allow-list (safe git, npm, grep), PostToolUse
TypeScript error hook, and PreToolUse destructive-pattern blocker.

---

## 3. The Core Problem (Why We Are Rebuilding)

The `expenses` table was built with one assumption: **every record is money going out.**
That assumption is baked in at every layer:

- `amount` is always positive — no concept of direction
- `expense_source`, `expense_status` enums are named `expense_*`
- Budget math (`SUM(amount) GROUP BY bucket_id`) only works for debits
- The OCR pipeline is wired for receipts, which are always purchases
- Categories are all spend-side — no income vocabulary

**A transaction is not always an expense:**

| Type | Direction | Example |
|---|---|---|
| Purchase | Debit (out) | Buying groceries |
| Chargeback / Refund | Credit (in) → expense category | Disputed charge reversed |
| Income | Credit (in) → TBB | Salary, rental payment, commission |
| Transfer out | Debit → no budget category | Moving money to savings |
| Transfer in | Credit → no budget category | Receiving a transfer |
| Bank fee | Debit | NSF fee, service charge |
| Interest earned | Credit → income category | Savings interest |
| Opening balance | Credit | Account setup |

The UI already says "Transactions" — the vocabulary is right. The database is wrong.

---

## 4. Architecture Decision: YNAB + Quicken Hybrid

**Decided: 2026-05-26.**

| Layer | Model | Behaviour |
|---|---|---|
| Data | **Ledger-style** | Every transaction has a direction (debit/credit), type, account, and two dates. A pure record of what happened. |
| Budget UI | **YNAB-style** | Income flows to "To Be Budgeted" (TBB). User assigns TBB to envelopes. Envelopes track Available = Assigned + Refunds − Spent. |
| Register UI | **Quicken-style** | Per-account transaction register, running balance, cleared/reconciled status. Mirrors the paper ledger. |

**How chargebacks and refunds work:**
A refund returns money to the expense category it came from — it does NOT go to TBB.
Rationale: the money was already "assigned" when it was spent. A refund just un-spends
it. Only genuinely new money (income not linked to a prior expense) goes to TBB.

| Event | Direction | Category | TBB effect |
|---|---|---|---|
| Grocery purchase $500 | Debit | Groceries (expense) | None |
| Grocery chargeback $500 | Credit | Groceries (expense) | None — Available +$500 |
| Salary $100,000 | Credit | (Income) | TBB +$100,000 |
| Credit card refund $63 | Credit | Bank Fees (expense) | None — Available +$63 |
| Cash gift $5,000 | Credit | (Income) | TBB +$5,000 |

**TBB formula:**
```
TBB = SUM(all income credit transactions ever)
    − SUM(all budget_assignments ever)
```
TBB must never go negative. The UI blocks assignments that would exceed TBB.

### 4.1 Double-Entry as Database Constraint (Not UI Layout)

**Decided: 2026-05-27.**

Double-entry bookkeeping is a **database constraint** — it is NOT a UI layout
requirement. The T-account (left/right, debit/credit columns) is a 1400s paper
convention for humans doing arithmetic by hand. The invariant it enforces ("every
economic event has two equal and opposite effects") lives in the data model, not
the screen.

**What this means for Ledger:**
- The UI is completely free to be modern and consumer-friendly (YNAB/Copilot style)
- The database enforces the constraint: transfers create two linked rows; the TBB
  formula balances income vs assignments
- The classical Chart of Accounts / General Ledger / Trial Balance layout lives
  only in the `/reports` accountant view
- Users never see "debit this account, credit that account" — they see
  "I spent $500 at JPS" and the app records both sides automatically

Every modern personal finance app (YNAB, Copilot, Monarch) is double-entry under
the hood. None show T-accounts. All enforce the invariant invisibly.

### 4.2 Accrual vs Cash from the Same Register

**Decided: 2026-05-27.**

The `transactions` table stores two dates per transaction:
- `date` — the **paid/settlement date** (cash basis: when money actually moved)
- `invoice_date` — the **obligation date** (accrual basis: when the charge was created)

This single design choice gives both reporting methods from the same data:

| Method | Use | Filter on |
|---|---|---|
| Cash basis | Jamaica IT01 personal tax return | `date` (paid date) |
| Accrual basis | True financial picture (what you owe) | `invoice_date` (obligation date) |

Jamaica personal tax returns use **cash basis**. A bill received in December but paid
in January appears on the NEXT year's return. The register shows both dates side by
side — the user can see when obligations were created vs when they were settled.

All reports offer a toggle: "Cash basis" vs "Accrual basis". Cash basis is the
default because it matches Jamaica IT01 requirements.

### 4.3 Type-Aware Transaction Entry Forms

**Decided: 2026-05-27. Implementation: Phase A5.**

The transaction entry form morphs based on transaction type. Showing irrelevant
fields confuses users and causes data entry errors.

| Type | Required fields | Optional fields |
|---|---|---|
| `purchase` | Account, Amount, Date, Payee | Invoice Date, Category, Budget, Ref #, Memo, Receipt |
| `income` | Account, Amount, Date, Income Category | Payee, Ref #, Memo |
| `transfer_out` | From Account, To Account, Amount, Date | Memo, Ref # |
| `transfer_in` | *(auto-created as the other side of transfer_out)* | — |
| `refund` | Account, Amount, Date, Original Transaction | Category (pre-filled from original) |
| `chargeback` | Account, Amount, Date | Payee, Ref #, Memo |
| `bank_fee` | Account, Amount, Date | Memo |
| `interest` | Account, Amount, Date | Memo |
| `opening_balance` | Account, Amount, Date | Memo |

Key UX decisions:
- Type selector is the **first field** — drives everything else
- Transfer creates **two rows** from one form (auto-linked via `transfer_pair_id`)
- Refund pre-fills category/budget from the linked original transaction
- Receipt upload is only offered for `purchase`, `bank_fee`, `chargeback`
- Income entry does NOT offer a receipt upload field

---

## 5. Target Data Model (v2)

### 5.1 New table: `transactions` (replaces `expenses` + `bank_entries`)

```sql
CREATE TABLE transactions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL,
  account_id            uuid NOT NULL REFERENCES bank_accounts(id),

  -- Direction and type
  direction             text NOT NULL,  -- 'debit' | 'credit'
  type                  text NOT NULL,
  -- type values:
  --   'purchase'         regular debit (grocery, fuel, etc.)
  --   'income'           new money arriving (salary, rent received, etc.)
  --   'transfer_out'     money leaving this account to another
  --   'transfer_in'      money arriving from another account
  --   'refund'           credit linked to a prior purchase
  --   'chargeback'       credit from disputed charge
  --   'bank_fee'         bank-initiated debit (NSF, service charge, etc.)
  --   'interest'         bank-credited interest earned
  --   'opening_balance'  account setup entry

  amount                numeric(12,2) NOT NULL,  -- always positive; direction carries sign
  currency              text NOT NULL DEFAULT 'JMD',

  -- Dates (both matter)
  date                  text NOT NULL,  -- paid/transaction date (YYYY-MM-DD)
  invoice_date          text,           -- when charge was created (optional)

  -- Parties
  payee_id              uuid REFERENCES payees(id),
  payee_name            text,           -- denormalized for fast display + search

  -- Classification
  category_id           uuid REFERENCES categories(id),
  bucket_id             uuid REFERENCES buckets(id),

  -- References
  reference_num         text,           -- check #, invoice #, wire reference
  memo                  text,           -- short description / sub-name
  notes                 text,           -- longer user note or AI note

  -- Reconciliation
  cleared               boolean NOT NULL DEFAULT false,  -- bank has processed it
  reconciled            boolean NOT NULL DEFAULT false,  -- matched to a statement

  -- Relationships
  transfer_pair_id      uuid,           -- links both sides of a transfer (self-ref)
  original_transaction_id uuid REFERENCES transactions(id), -- for refunds/chargebacks

  -- Media
  receipt_url           text,

  -- Provenance
  source                text NOT NULL DEFAULT 'manual',
  -- source values: 'manual' | 'telegram' | 'shortcut' | 'csv'
  status                text NOT NULL DEFAULT 'confirmed',
  -- status values: 'pending_ocr' | 'pending_review' | 'confirmed'

  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);
```

### 5.2 New table: `payees`

```sql
CREATE TABLE payees (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL,
  name                  text NOT NULL,          -- e.g. "JPS", "NCB", "Tax Admin Jamaica"
  sub_name              text,                   -- e.g. "Rhyne Park", "Overton branch"
  default_category_id   uuid REFERENCES categories(id),
  default_bucket_id     uuid REFERENCES buckets(id),
  created_at            timestamptz DEFAULT now()
);
```

The app learns your habits: after 3 transactions, JPS always maps to Electricity.

### 5.3 New table: `budget_assignments` (TBB → envelope flow)

```sql
CREATE TABLE budget_assignments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL,
  bucket_id             uuid NOT NULL REFERENCES buckets(id),
  month                 text NOT NULL,          -- 'YYYY-MM'
  amount                numeric(12,2) NOT NULL, -- amount assigned to this envelope this month
  created_at            timestamptz DEFAULT now(),
  UNIQUE (user_id, bucket_id, month)            -- one assignment per bucket per month
);
```

### 5.4 Modified: `categories`

```sql
ALTER TABLE categories ADD COLUMN type text NOT NULL DEFAULT 'expense';
-- type values: 'expense' | 'income'
```

Income categories (type='income'): Salary, Rental Income, Commission, Dividends,
Interest, Refund/Reimbursement, Other Income.
Expense categories (type='expense'): all current presets.

### 5.5 Unchanged tables (with extensions)

| Table | Status | Notes |
|---|---|---|
| `bank_accounts` | Keep + extend | Phase B: add new `type` values for liabilities (`credit_card`, `mortgage`, `loan`) |
| `buckets` | Keep | Budget envelopes — name, period, amount |
| `goals` | Keep | Separate concept from TBB |
| `categories` | Modify | Add `type` column only |

**Liability account decision (2026-05-27):** Liabilities are modeled as additional
`type` values on `bank_accounts`, NOT a separate table. A credit card, mortgage, or
car loan is still an account — transactions flow through it; the balance sheet split
is a `WHERE type IN (...)` clause. One table keeps all queries, the register, and the
account selector simple. Balance sheet:
```
Assets:      type IN ('checking', 'savings', 'cash', 'investment')
Liabilities: type IN ('credit_card', 'mortgage', 'loan')
Net Worth:   computed — SUM(assets) − SUM(liabilities)
```

### 5.6 Tables to drop (after migration)

| Table | Replaced by |
|---|---|
| `expenses` | `transactions` |
| `bank_entries` | `transactions` (source='csv', cleared=true) |
| `buckets_summary` (view) | Direct Drizzle queries with date ranges |

---

## 6. Migration Plan

Migration is done in phases so the app remains functional throughout. Old tables
stay live until Phase A5. Each phase is a separate PR.

### Phase A1 — Create new tables alongside old ones
- Create `transactions`, `payees`, `budget_assignments` tables
- Add `type` column to `categories`
- Add income-type preset categories
- **No existing data touched. App unchanged.**
- Migration: `20240013_create_transactions_payees_assignments.sql`

### Phase A2 — Build the Register UI (current data, new layout)
- New `/register` page — Quicken-style account register table
- Reads from `expenses` + bank account join (best effort for now)
- Displays DEBIT/CREDIT columns, running balance, cleared indicator
- This is the **debugging tool**: visual register lets you spot data problems
  instantly during the migration
- No API changes. Server component only.

### Phase A3 — Migrate existing data
- **Pre-step:** Create one "Unassigned" bank account (sentinel) per user
  - `name = 'Unassigned'`, `type = 'checking'`, `active = false`
  - This preserves `account_id NOT NULL` on every migrated row
  - The register will highlight rows with `account_id = <unassigned-uuid>` in amber
    so the user can identify and reassign them
- Copy all `expenses` rows → `transactions`
  - `direction = 'debit'`, `type = 'purchase'`
  - `account_id = <unassigned-uuid>` (user re-assigns from the register)
  - All other fields map directly
- Copy `bank_entries` → `transactions`
  - `direction = 'debit'` or `'credit'` based on `bank_entries.type`
  - `cleared = true`, `source = 'csv'`
  - `account_id = <unassigned-uuid>` unless bank_entry has a linked account
- Verify row counts match before proceeding
- Migration: `20240014_migrate_expenses_to_transactions.sql`

### Phase A4 — Rewrite all queries and APIs
- Update Drizzle schema: remove `expenses`, `bankEntries`; add `transactions`, `payees`, `budgetAssignments`
- Update every file that references `expenses` schema:
  - `app/api/expenses/[id]/route.ts` → `app/api/transactions/[id]/route.ts`
  - `app/api/expenses/[id]/retry-ocr/route.ts` → same, new path
  - `app/api/upload/route.ts` — insert into `transactions`
  - `app/api/shortcut/upload/route.ts` — same
  - `app/api/telegram/webhook/route.ts` — same
  - `app/page.tsx` — dashboard aggregates
  - `app/transactions/page.tsx` — reads from `transactions`
  - `app/review/page.tsx` + `ReviewCard.tsx` — reads from `transactions`
  - `app/accounts/page.tsx` — reads from `transactions`
  - `app/plan/page.tsx` — budget math
- Update CLAUDE.md rules
- Update `docs/architecture.md`

### Phase A5 — New features enabled by v2 model
- **Plan page revamp (monthly-only YNAB style):**
  - Period selector removed from Plan page — always monthly
  - Top panel: TBB = income received this month − total assigned
  - Envelope list: `Assigned this month | Spent | Available` columns
  - `buckets.amount` becomes the *suggested* monthly assignment (prefills the field)
  - Pro-rating across budget periods removed from Plan page (dashboard keeps it)
  - TBB carries forward month-to-month (unassigned income is never lost)
- Type-aware transaction entry form (`TransactionEntryForm` component, morphs by type)
- Income transaction entry (salary, rent, commission — not receipt-based)
- Transfer entry UI (single form → two linked rows via `transfer_pair_id`)
- Per-account register view at `/accounts/[id]`
- Payee autocomplete + learning (default category after N transactions)
- Reconciliation workflow: mark cleared → mark reconciled against statement
- OCR updated: income/chargeback/refund detection

### Phase A6 — Drop old tables
- `DROP TABLE expenses` (after confirming zero reads)
- `DROP TABLE bank_entries`
- Remove `buckets_summary` view (already unused in dashboard since P5)
- Final cleanup of dead code

---

## 7. UI / UX Standards

| Rule | Value |
|---|---|
| Primary accent | `blue-600` (#2563EB) — no `indigo` anywhere |
| Sidebar background | `bg-[#1B1F3B]` (dark navy) |
| Page background | `bg-gray-50` |
| Cards | `bg-white border border-gray-200 shadow-sm rounded-2xl` |
| Currency formatting | Always `formatJMD()` or `formatCurrency()` — never inline `Intl.NumberFormat` |
| Category/Budget fields | Always `<select>` from DB — never free-text |
| Debit amounts | `text-gray-900` or `text-red-600` for credit card accounts |
| Credit amounts | `text-emerald-600` |
| Running balance | Monospace (`tabular-nums`), negative = `text-red-600` |
| Mobile nav | Bottom tab bar `md:hidden`, 5 tabs + More drawer |
| Sidebar nav | `hidden md:flex`, fixed left, `w-56` |

---

## 8. Technical Rules (Invariants)

- Every Drizzle query MUST include `WHERE user_id = [authenticated user id]`
  (service role bypasses RLS entirely)
- `account_id` is required on every new transaction (v2+)
- Confirming a transaction sets THREE fields: `confirmed_category` (text),
  `category_id` (UUID FK), `bucket_id` (UUID FK)
- TBB must never go negative — block in UI before hitting DB
- Transfers always create two rows linked by `transfer_pair_id` — never one
- Refunds/chargebacks link to their `original_transaction_id`
- Amount is always stored positive — `direction` carries the sign
- `invoice_date` is optional; `date` (paid date) is required

---

## 9. Answered Decisions

| Question | Answer | Date |
|---|---|---|
| YNAB or Quicken style? | Both — ledger data model, YNAB budget UI, Quicken register UI | 2026-05-26 |
| Signed amount or direction column? | Separate `direction` column + amount always positive | 2026-05-26 |
| Where do chargebacks go? | Back to the originating expense category, NOT to TBB | 2026-05-26 |
| TBB concept? | Yes — income goes to TBB first, user assigns to envelopes | 2026-05-26 |
| Transfer UI: single form or manual? | Single form — app creates both sides automatically | 2026-05-26 (pending impl.) |
| Account required on every transaction? | Yes — must assign account at entry time (v2+) | 2026-05-26 (pending impl.) |
| Drop bank_entries? | Yes — replaced by transactions with source='csv' | 2026-05-26 |
| Double-entry T-account UI? | No. Double-entry is a DB constraint. UI is consumer-friendly. T-accounts only in `/reports`. | 2026-05-27 |
| Accrual vs cash reporting? | Store both dates. Reports default to cash basis (Jamaica IT01). Toggle to accrual available. | 2026-05-27 |
| Type-aware entry forms? | Yes — form morphs by transaction type. One form, dynamic fields. Phase A5 implementation. | 2026-05-27 |
| `/reports` section? | Yes — Chart of Accounts, General Ledger, Trial Balance, Income Statement, Balance Sheet. Phase B. | 2026-05-27 |
| Accountant access gating? | `/reports` visible to user now. Later: gated to accountant role or PDF-export only. | 2026-05-27 |
| `account_id` nullable during migration? | No — stays NOT NULL. Migrated rows assigned to "Unassigned" sentinel account. User re-assigns from register. | 2026-05-27 |
| Liability accounts: separate table or extend `bank_accounts`? | Extend `bank_accounts` with new type values (`credit_card`, `mortgage`, `loan`). One table, balance sheet splits by type. | 2026-05-27 |
| TBB carry-forward? | Carries forward month-to-month — unassigned income is never lost. Plan page is always monthly. | 2026-05-27 |

## 10. Open Decisions

| Question | Options | Notes |
|---|---|---|
| Reconciliation workflow | Auto-match CSV vs manual tick | How does the user match imported rows to existing transactions? |
| TBB carry-forward | Carry month-to-month vs reset | Does unspent TBB roll into next month? (YNAB: yes) |
| Payee learning threshold | After 1, 2, or 3 transactions | When does JPS auto-suggest Electricity? |
| Income OCR | Detect income from deposit slips? | Would require training the OCR prompt for credits |
| Investment accounts | Separate account type | Retirement savings, unit trusts, equities. Not spending accounts — tracked differently. |
| Tax-deductible flag | `is_deductible` boolean on `categories` | Which expense categories are tax-deductible in Jamaica? How granular? |
| TAJ Schedule 1 subcategories | Extend income category type | Employment / Rental / Commission / Dividend / Interest / Other. Required for IT01 helper. |
| Accountant gating timeline | Role flag on users table | When does `/reports` become accountant-only vs always visible to the user? |
| Opening balances | Auto-generate from `bank_accounts.balance` | Current balance field → one-time `opening_balance` transaction per account. When/how to migrate? |

---

## 11. Feature Roadmap

### Near-term (Phase A1–A3, current sprint)
- [ ] Create new DB tables (`transactions`, `payees`, `budget_assignments`)
- [ ] Add `type` column to categories + income preset categories
- [ ] Build `/register` — Quicken-style account register table (Phase A2, debugging tool)
- [ ] Migrate existing data from `expenses` → `transactions`

### Mid-term (Phase A4–A5)
- [ ] Rewrite all API routes and queries to use `transactions`
- [ ] TBB panel on Plan page
- [ ] Income transaction entry form
- [ ] Transfer entry (single form → two linked rows)
- [ ] Per-account register at `/accounts/[id]`
- [ ] Payee table + autocomplete + learning

### Long-term (Phase A6+)
- [ ] Reconciliation workflow (cleared → reconciled)
- [ ] CSV bank statement import → `transactions` (replace `bank_entries`)
- [ ] Refund/chargeback linking to original transaction
- [ ] Annual P&L report (income − expenses by category, Jan–Dec columns)
- [ ] PWA icons
- [ ] Filter bar on Plan page (All / Underfunded / Overfunded)
- [ ] "Left over from last month" rollover in Plan right panel
- [ ] Scheduled/recurring transactions

### Phase B — Financial Statements (post Phase A6)
- [ ] `/reports` section entry point in sidebar
- [ ] Chart of Accounts (all accounts with current balances)
- [ ] General Ledger (all transactions, chronological, debit/credit columns)
- [ ] Trial Balance (total debits vs total credits — proves the books balance)
- [ ] Income Statement (revenue − expenses by category, monthly columns, Jan–Dec)
- [ ] Balance Sheet (assets − liabilities = net worth — point-in-time)
- [ ] Cash Flow Statement (operating / investing / financing)
- [ ] Jamaica IT01 helper (cash-basis income by TAJ Schedule 1 category, deductible expenses, estimated taxable income)
- [ ] Tax-deductible flag on `categories` (`is_deductible boolean`)
- [ ] TAJ Schedule 1 income subcategories on income `categories`
- [ ] Liability account type (mortgage, car loan, credit card balance owed)
- [ ] Investment account type (retirement savings, unit trusts, equities)
- [ ] PDF export of any financial statement (for accountant handoff)
- [ ] Accountant role gating on `/reports`

---

## 12. Financial Statements & Tax Reporting

### 12.1 Current Completeness

The transaction register is the hard part — raw data, correctly modeled. Financial
statements are analysis layered on top. As of Phase 6d (expenses table only):

**Overall completeness: ~65%**

| Statement | Status | Gap |
|---|---|---|
| Income Statement (P&L) | ~65% | Expense side solid. Income transactions don't exist yet. |
| Cash Flow Statement | ~50% | No transfers, capital movements, or bank fees modeled yet. |
| Balance Sheet | ~30% | No liability accounts. No investment accounts. Opening balance entries needed. |
| Jamaica IT01 Schedule | ~40% | No income subcategories (employment vs rental vs commission). No tax-deductible flag on expenses. |

### 12.2 What Is Missing for Complete Statements

**To complete the Income Statement:**
- Income transactions (salary, rental, commission, dividends, interest earned) — Phase A1+
- Income categories with `type='income'` — Phase A1
- Year-to-date aggregation in `/reports`

**To complete the Balance Sheet:**
- Liability accounts: mortgage, car loan, credit card balance owed
  (a liability is money you OWE — the inverse of an asset)
- Investment accounts: retirement savings, unit trusts, equities (not spending accounts)
- Opening balance transactions for each account (one `opening_balance` entry per account at setup)

**To complete the Jamaica IT01:**
- Tax-deductible flag on `categories` (`is_deductible boolean`)
- TAJ Schedule 1 income subcategories:
  - Employment income (salary, wages)
  - Rental income
  - Business / commission income
  - Dividend income
  - Interest income
  - Other income
- Cash-basis date filter: Jan 1 – Dec 31, using `date` (paid date field)

### 12.3 Jamaica Tax Context

| Fact | Detail |
|---|---|
| Tax authority | TAJ — Tax Administration Jamaica |
| Personal return form | IT01 |
| Filing basis | Cash basis (individuals) — report income/expenses in the year money actually moves |
| Tax year | Calendar year: January 1 – December 31 |
| Key implication | A December invoice paid in January appears on the NEXT year's return |
| Deductions | NHT, NIS, pension contributions, approved charitable donations |

The app's `date` field (paid date) is the cash-basis anchor for Jamaica IT01.
`invoice_date` is stored for accrual reporting but NOT used for tax calculations.

### 12.4 Account Types for the Balance Sheet

All account types live in `bank_accounts.type`. No separate liabilities table.
The balance sheet groups by type with a WHERE clause.

```
Assets (bank_accounts WHERE type IN):
  'checking'      Checking / current accounts
  'savings'       Savings accounts
  'cash'          Physical cash (wallet, petty cash)
  'investment'    Retirement savings, unit trusts, equities  ← Phase B

Liabilities (bank_accounts WHERE type IN):           ← Phase B
  'credit_card'   Credit card (balance = amount owed)
  'mortgage'      Home mortgage
  'loan'          Car loan, personal loan, other debt

Equity (computed, never stored):
  Net Worth = SUM(asset balances) − SUM(liability balances)
```

One table, one account selector, one register — the balance sheet split is presentation only.

---

## 13. /reports Section Design

**Status:** Planned. Phase B (after Phase A6 completes the data model migration.)

The `/reports` route is the explicit accountant view. It surfaces transaction data
in the formal financial statement formats that accountants and tax preparers expect.
The rest of the app remains consumer-friendly — no T-accounts, no journal entries.

### 13.1 Six Views

| View | What it shows |
|---|---|
| **Chart of Accounts** | All accounts (assets, liabilities) with current balances. The double-entry foundation. |
| **General Ledger** | Every transaction across all accounts, chronological. Debit/Credit columns. Running balance per account. |
| **Trial Balance** | Total debits vs total credits across all accounts. Proves the books balance. |
| **Income Statement** | Revenue − Expenses = Net Income. Monthly columns, Jan–Dec. Grouped by income/expense categories. |
| **Balance Sheet** | Assets − Liabilities = Net Worth (equity). Point-in-time snapshot. |
| **Cash Flow Statement** | Operating / Investing / Financing activities. Where cash came from and went. |

### 13.2 Jamaica IT01 Helper

A seventh view, Jamaica-specific:
- Basis: **cash** (Jan 1 – Dec 31, filter on `date` field only)
- Income grouped by TAJ Schedule 1 category (Employment, Rental, Commission, etc.)
- Deductible expenses listed with total
- Estimated taxable income = Gross income − Deductions
- Prominent disclaimer: "For reference only — not tax advice. File with a registered tax practitioner."

### 13.3 Access and Export

- **Phase B launch:** `/reports` visible to the logged-in user. No gating initially.
- **Phase B+:** PDF export of any statement (for accountant handoff).
- **Future:** Accountant role flag — grant a second user read-only access to `/reports`
  only. The main app remains private. The accountant sees statements, not the register.

### 13.4 What /reports Does NOT Do

- Not a full accounting system — no manual journal entries, no adjusting entries
- The General Ledger is a VIEW of `transactions`, not a separate accounting journal
- Tax estimates are reference-only — the actual IT01 must be filed by a tax practitioner

---

*Last updated: 2026-05-27*
