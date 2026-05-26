import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { expenses } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET() {
  const user = await requireUser();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(expenses)
    .where(
      and(
        eq(expenses.user_id, user.id),
        sql`status IN ('pending_review', 'pending_ocr')`
      )
    );
  return NextResponse.json({ count: row?.count ?? 0 });
}
