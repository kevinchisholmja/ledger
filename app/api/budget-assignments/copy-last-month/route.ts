import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { budgetAssignments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

function priorMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const { year_month } = await req.json();

  if (!year_month || !/^\d{4}-\d{2}$/.test(year_month)) {
    return NextResponse.json({ error: "year_month (YYYY-MM) required" }, { status: 400 });
  }

  const prior = priorMonth(year_month);

  const priorRows = await db
    .select({ bucket_id: budgetAssignments.bucket_id, amount: budgetAssignments.amount })
    .from(budgetAssignments)
    .where(and(eq(budgetAssignments.user_id, user.id), eq(budgetAssignments.month, prior)));

  if (priorRows.length === 0) {
    return NextResponse.json({ copied: 0 });
  }

  // Insert all prior rows into the target month — skip any that already exist
  await db
    .insert(budgetAssignments)
    .values(priorRows.map((r) => ({
      user_id: user.id,
      bucket_id: r.bucket_id,
      month: year_month,
      amount: r.amount,
    })))
    .onConflictDoNothing();

  return NextResponse.json({ copied: priorRows.length });
}
