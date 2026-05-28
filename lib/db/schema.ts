import {
  pgTable,
  pgEnum,
  uuid,
  text,
  numeric,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

// ── Enums ────────────────────────────────────────────────────────────────────

export const budgetPeriodEnum = pgEnum("budget_period", [
  "weekly",
  "fortnightly",
  "monthly",
  "quarterly",
  "annual",
  "biennial",
  "quinquennial",
  "triennial",
  "decennial",
]);

// ── Tables ───────────────────────────────────────────────────────────────────

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  name: text("name").notNull(),
  icon: text("icon"),
  type: text("type").notNull().default("expense"), // 'expense' | 'income'
  bucket_id: uuid("bucket_id"), // FK set after buckets is defined — see below
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const buckets = pgTable("buckets", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  name: text("name").notNull(),
  period: budgetPeriodEnum("period").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  color: text("color"),
  icon: text("icon"),
  currency: text("currency").notNull().default("JMD"),
  active: boolean("active").notNull().default(true),
  group_name: text("group_name").notNull().default("Uncategorized"),
  category_id: uuid("category_id").references(() => categories.id),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});


export const bankAccounts = pgTable("bank_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("checking"),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("JMD"),
  active: boolean("active").notNull().default(true),
  on_budget: boolean("on_budget").notNull().default(true), // false = liability/investment (off-budget)
  account_number: text("account_number"),
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  name: text("name").notNull(),
  icon: text("icon"),
  target_amount: numeric("target_amount", { precision: 14, scale: 2 }).notNull(),
  target_date: text("target_date").notNull(), // YYYY-MM-DD (stored as first of target month)
  monthly_allocation: numeric("monthly_allocation", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("JMD"),
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── v2 tables (Phase A1) ─────────────────────────────────────────────────────

export const payees = pgTable("payees", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  name: text("name").notNull(),
  sub_name: text("sub_name"),
  default_category_id: uuid("default_category_id").references(() => categories.id),
  default_bucket_id: uuid("default_bucket_id").references(() => buckets.id),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  account_id: uuid("account_id").references(() => bankAccounts.id),
  direction: text("direction").notNull(),          // 'debit' | 'credit'
  type: text("type").notNull(),                    // 'purchase' | 'income' | 'transfer_out' | ...
  amount: numeric("amount", { precision: 12, scale: 2 }), // nullable — unknown for pending_ocr
  currency: text("currency").notNull().default("JMD"),
  date: text("date").notNull(),                    // paid/settlement date (YYYY-MM-DD)
  invoice_date: text("invoice_date"),              // obligation date (accrual, optional)
  payee_id: uuid("payee_id").references(() => payees.id),
  payee_name: text("payee_name"),
  category_id: uuid("category_id").references(() => categories.id),
  bucket_id: uuid("bucket_id").references(() => buckets.id),
  reference_num: text("reference_num"),
  memo: text("memo"),
  notes: text("notes"),
  cleared: boolean("cleared").notNull().default(false),
  reconciled: boolean("reconciled").notNull().default(false),
  transfer_pair_id: uuid("transfer_pair_id"),       // FK to transactions(id) — set in DB only
  original_transaction_id: uuid("original_transaction_id"), // FK to transactions(id) — set in DB only
  receipt_url: text("receipt_url"),
  source: text("source").notNull().default("manual"),
  status: text("status").notNull().default("confirmed"),
  flagged: boolean("flagged").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const budgetAssignments = pgTable("budget_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  bucket_id: uuid("bucket_id").notNull().references(() => buckets.id),
  month: text("month").notNull(),                  // 'YYYY-MM'
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  // UNIQUE (user_id, bucket_id, month) enforced in DB migration
});

// ── Types ────────────────────────────────────────────────────────────────────

export type Category = typeof categories.$inferSelect;
export type Bucket = typeof buckets.$inferSelect;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type Goal = typeof goals.$inferSelect;

export type NewBucket = typeof buckets.$inferInsert;
export type NewCategory = typeof categories.$inferInsert;
export type NewBankAccount = typeof bankAccounts.$inferInsert;
export type NewGoal = typeof goals.$inferInsert;

// v2 types (Phase A1+)
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Payee = typeof payees.$inferSelect;
export type NewPayee = typeof payees.$inferInsert;
export type BudgetAssignment = typeof budgetAssignments.$inferSelect;
export type NewBudgetAssignment = typeof budgetAssignments.$inferInsert;
