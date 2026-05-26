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

export const expenseSourceEnum = pgEnum("expense_source", [
  "telegram",
  "shortcut",
  "manual",
  "csv",
]);

export const expenseStatusEnum = pgEnum("expense_status", [
  "pending_ocr",
  "pending_review",
  "confirmed",
  "reconciled",
]);

export const matchStatusEnum = pgEnum("match_status", [
  "unmatched",
  "matched",
  "ignored",
]);

// ── Tables ───────────────────────────────────────────────────────────────────

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  name: text("name").notNull(),
  icon: text("icon"),
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

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  source: expenseSourceEnum("source").notNull(),
  status: expenseStatusEnum("status").notNull().default("pending_review"),
  receipt_url: text("receipt_url"),
  raw_ocr_text: text("raw_ocr_text"),
  merchant: text("merchant"),
  amount: numeric("amount", { precision: 12, scale: 2 }), // nullable — migration 20240004
  currency: text("currency").notNull().default("JMD"),
  date: text("date").notNull(),
  bucket_id: uuid("bucket_id").references(() => buckets.id),
  ai_suggested_category: text("ai_suggested_category"),
  confirmed_category: text("confirmed_category"),
  category_id: uuid("category_id").references(() => categories.id),
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const bankEntries = pgTable("bank_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  type: text("type").notNull(),
  date: text("date").notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(), // always positive
  currency: text("currency").notNull().default("JMD"),
  match_status: matchStatusEnum("match_status").notNull().default("unmatched"),
  expense_id: uuid("expense_id").references(() => expenses.id),
  raw_row: text("raw_row"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const bankAccounts = pgTable("bank_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("checking"),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("JMD"),
  active: boolean("active").notNull().default(true),
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

// ── Types ────────────────────────────────────────────────────────────────────

export type Category = typeof categories.$inferSelect;
export type Bucket = typeof buckets.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type BankEntry = typeof bankEntries.$inferSelect;

export type NewExpense = typeof expenses.$inferInsert;
export type NewBucket = typeof buckets.$inferInsert;
export type NewCategory = typeof categories.$inferInsert;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type NewBankAccount = typeof bankAccounts.$inferInsert;
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
