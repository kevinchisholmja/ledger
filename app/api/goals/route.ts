import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { goals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const user = await requireUser();
  const rows = await db.select().from(goals)
    .where(eq(goals.user_id, user.id))
    .orderBy(goals.target_date);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const user = await requireUser();
  const { name, icon, target_amount, target_date, monthly_allocation, currency, notes } = await req.json();
  const [row] = await db.insert(goals).values({
    user_id: user.id,
    name,
    icon: icon || null,
    target_amount: String(target_amount),
    target_date,
    monthly_allocation: String(monthly_allocation),
    currency: currency ?? "JMD",
    notes: notes || null,
  }).returning();
  return NextResponse.json(row, { status: 201 });
}
