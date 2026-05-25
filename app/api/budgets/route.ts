import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { buckets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();

  const rows = await db
    .select()
    .from(buckets)
    .where(eq(buckets.user_id, user.id))
    .orderBy(buckets.name);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = await req.json();

  const { name, period, amount, category_id, group_name } = body;
  if (!name || !period || amount == null) {
    return NextResponse.json({ error: "name, period, amount required" }, { status: 400 });
  }

  const [created] = await db
    .insert(buckets)
    .values({
      user_id: user.id,
      name,
      period,
      amount: String(amount),
      category_id: category_id ?? null,
      group_name: group_name ?? "Uncategorized",
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
