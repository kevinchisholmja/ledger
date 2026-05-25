import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { bankAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.user_id, user.id))
    .orderBy(bankAccounts.name);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const { name, type, balance, currency } = await req.json();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const [created] = await db
    .insert(bankAccounts)
    .values({
      user_id: user.id,
      name,
      type: type ?? "checking",
      balance: String(balance ?? 0),
      currency: currency ?? "JMD",
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
