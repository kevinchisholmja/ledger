import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { payees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();

  const rows = await db
    .select()
    .from(payees)
    .where(eq(payees.user_id, user.id))
    .orderBy(payees.name);

  return NextResponse.json(rows);
}
