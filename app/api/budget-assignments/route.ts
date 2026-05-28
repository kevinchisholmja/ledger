import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { budgetAssignments, buckets } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const { bucket_id, month, amount } = await req.json();

  if (!bucket_id || !month || amount == null) {
    return NextResponse.json({ error: "bucket_id, month, amount required" }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month must be YYYY-MM" }, { status: 400 });
  }

  // Verify the bucket belongs to this user
  const bucket = await db
    .select({ id: buckets.id })
    .from(buckets)
    .where(and(eq(buckets.id, bucket_id), eq(buckets.user_id, user.id)))
    .limit(1);

  if (bucket.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [row] = await db
    .insert(budgetAssignments)
    .values({ user_id: user.id, bucket_id, month, amount: String(amount) })
    .onConflictDoUpdate({
      target: [budgetAssignments.user_id, budgetAssignments.bucket_id, budgetAssignments.month],
      set: { amount: String(amount) },
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
