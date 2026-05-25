import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { buckets, categories, expenses } from "@/lib/db/schema";
import { eq, and, ne, gte, lte, isNotNull, or, sql } from "drizzle-orm";
import { BUDGET_PERIOD_DAYS } from "@/lib/period";
import PlanClient from "./PlanClient";

export interface PlanBudget {
  id: string;
  name: string;
  icon: string | null;
  period: string;
  nativeAmount: number;
  monthlyAmount: number;
  activity: number;
  available: number;
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

  const [userBuckets, spendingRows, pendingCount] = await Promise.all([
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

    db.select({
      bucket_id: expenses.bucket_id,
      total: sql<string>`COALESCE(SUM(${expenses.amount}::numeric), 0)`,
    })
    .from(expenses)
    .where(and(
      eq(expenses.user_id, user.id),
      gte(expenses.date, start),
      lte(expenses.date, end),
      ne(expenses.status, "pending_ocr"),
      isNotNull(expenses.bucket_id),
      isNotNull(expenses.amount),
    ))
    .groupBy(expenses.bucket_id),

    db.select({ count: sql<number>`count(*)::int` }).from(expenses)
      .where(and(
        eq(expenses.user_id, user.id),
        or(eq(expenses.status, "pending_review"), eq(expenses.status, "pending_ocr")),
      ))
      .then((r) => r[0]?.count ?? 0),
  ]);

  const spendMap = new Map(spendingRows.map((s) => [s.bucket_id!, Number(s.total)]));

  const planBudgets: PlanBudget[] = userBuckets.map((b) => {
    const native = Number(b.amount);
    const monthly = monthlyProrated(native, b.period);
    const activity = spendMap.get(b.id) ?? 0;
    return {
      id: b.id,
      name: b.name,
      icon: b.icon,
      period: b.period,
      nativeAmount: native,
      monthlyAmount: monthly,
      activity,
      available: monthly - activity,
      currency: b.currency ?? "JMD",
      category_name: b.category_name ?? "Uncategorized",
      category_id: b.category_id,
    };
  });

  // Build groups by category, preserving DB order, then alpha-sort
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
      totalAssigned: budgets.reduce((s, b) => s + b.monthlyAmount, 0),
      totalActivity: budgets.reduce((s, b) => s + b.activity, 0),
      totalAvailable: budgets.reduce((s, b) => s + b.available, 0),
    }));

  const totalAssigned = groups.reduce((s, g) => s + g.totalAssigned, 0);
  const totalActivity = groups.reduce((s, g) => s + g.totalActivity, 0);
  const totalAvailable = totalAssigned - totalActivity;

  return (
    <PlanClient
      groups={groups}
      yearMonth={yearMonth}
      monthLabel={monthLabel}
      totalAssigned={totalAssigned}
      totalActivity={totalActivity}
      totalAvailable={totalAvailable}
      pendingCount={pendingCount}
      userEmail={user.email ?? ""}
    />
  );
}
