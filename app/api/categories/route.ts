import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();

  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.user_id, user.id))
    .orderBy(categories.name);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = await req.json();

  const { name, icon } = body;
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const [created] = await db
    .insert(categories)
    .values({ user_id: user.id, name, icon: icon ?? null })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
