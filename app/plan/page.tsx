import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { buckets, categories, transactions, budgetAssignments } from "@/lib/db/schema";
import { eq, and, ne, gte, lte, isNotNull, sql } from "drizzle-orm";
import { BUDGET_PERIOD_DAYS } from "@/lib/period";
import PlanClient from "./PlanClient";

export interface PlanBudget {
  id: string;
  name: string;
  icon: string | null;
  period: string;
  suggested: number;   // buckets.amount prorated — shown as prefill hint when editing
  assigned: number;    // from budget_assignments this month (0 if no row)
  activity: number;
  available: number;   // assigned - activity
  currency: string;
  category_name: string;
  category_id: string | null;
}

export interface PlanGroup {
  name: string;
  category_id: string | null;
  budgets: PlanBudget[];
  totalAssigned: number;
  totalActivity: number;
  totalAvailable: number;
}

const AVG_MONTH_DAYS = 365.25 / 12;

function monthlyProrated(nativeAmount: number, period: string): number {
  const native = BUDGET_PERIOD_DAYS[period] ?? AVG_MONTH_DAYS;
  return nativeAmount * (AVG_MONTH_DAYS / native);
}

function getMonthRange(yearMonth: string): { start: string; end: string } {
  const [y, m] = yearMonth.split("-").map(Number);
  const startD = new Date(y, m - 1, 1);
  const endD = new Date(y, m, 0);
  return {
    start: startD.toISOString().slice(0, 10),
    end: endD.toISOString().slice(0, 10),
  };
}

function formatYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-JM", { month: "long", year: "numeric" });
}

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const { month: rawMonth } = await searchParams;

  const yearMonth = /^\d{4}-\d{2}$/.test(rawMonth ?? "") ? rawMonth! : currentYearMonth();
  const { start, end } = getMonthRange(yearMonth);
  const monthLabel = formatYearMonth(yearMonth);

  const [userBuckets, assignmentRows, spendingRows, incomeRow] = await Promise.all([
    db.select({
      id: buckets.id,
      name: buckets.name,
      icon: buckets.icon,
      period: buckets.period,
      amount: buckets.amount,
      currency: buckets.currency,
      category_id: buckets.category_id,
      category_name: categories.name,
    })
    .from(buckets)
    .leftJoin(categories, eq(buckets.category_id, categories.id))
    .where(and(eq(buckets.user_id, user.id), eq(buckets.active, true)))
    .orderBy(categories.name, buckets.name),

    db.select({ bucket_id: budgetAssignments.bucket_id, amount: budgetAssignments.amount })
      .from(budgetAssignments)
      .where(and(eq(budgetAssignments.user_id, user.id), eq(budgetAssignments.month, yearMonth))),

    db.select({
      bucket_id: transactions.bucket_id,
      total: sql<string>`COALESCE(SUM(${transactions.amount}::numeric), 0)`,
    })
    .from(transactions)
    .where(and(
      eq(transactions.user_id, user.id),
      gte(transactions.date, start),
      lte(transactions.date, end),
      ne(transactions.status, "pending_ocr"),
      isNotNull(transactions.bucket_id),
      isNotNull(transactions.amount),
      eq(transactions.direction, "debit"),
    ))
    .groupBy(transactions.bucket_id),

    db.select({ total: sql<string>`COALESCE(SUM(${transactions.amount}::numeric), 0)` })
      .from(transactions)
      .where(and(
        eq(transactions.user_id, user.id),
        gte(transactions.date, start),
        lte(transactions.date, end),
        eq(transactions.type, "income"),
        ne(transactions.status, "pending_ocr"),
        isNotNull(transactions.amount),
      )),
  ]);

  const assignmentMap = new Map(assignmentRows.map((r) => [r.bucket_id!, Number(r.amount)]));
  const spendMap = new Map(spendingRows.map((s) => [s.bucket_id!, Number(s.total)]));
  const incomeTotal = Number(incomeRow[0]?.total ?? 0);

  const planBudgets: PlanBudget[] = userBuckets.map((b) => {
    const assigned = assignmentMap.get(b.id) ?? 0;
    const suggested = monthlyProrated(Number(b.amount), b.period);
    const activity = spendMap.get(b.id) ?? 0;
    return {
      id: b.id,
      name: b.name,
      icon: b.icon,
      period: b.period,
      suggested,
      assigned,
      activity,
      available: assigned - activity,
      currency: b.currency ?? "JMD",
      category_name: b.category_name ?? "Uncategorized",
      category_id: b.category_id,
    };
  });

  const groupMap = new Map<string, PlanBudget[]>();
  for (const b of planBudgets) {
    if (!groupMap.has(b.category_name)) groupMap.set(b.category_name, []);
    groupMap.get(b.category_name)!.push(b);
  }

  const groups: PlanGroup[] = [...groupMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, budgets]) => ({
      name,
      category_id: budgets[0]?.category_id ?? null,
      budgets,
      totalAssigned: budgets.reduce((s, b) => s + b.assigned, 0),
      totalActivity: budgets.reduce((s, b) => s + b.activity, 0),
      totalAvailable: budgets.reduce((s, b) => s + b.available, 0),
    }));

  const tbbAssigned = assignmentRows.reduce((s, r) => s + Number(r.amount), 0);
  const tbb = incomeTotal - tbbAssigned;
  const totalActivity = groups.reduce((s, g) => s + g.totalActivity, 0);

  return (
    <PlanClient
      groups={groups}
      yearMonth={yearMonth}
      monthLabel={monthLabel}
      tbb={tbb}
      tbbIncome={incomeTotal}
      tbbAssigned={tbbAssigned}
      totalActivity={totalActivity}
    />
  );
}
