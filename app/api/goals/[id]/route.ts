import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { goals } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { monthly_allocation } = await req.json();
  const [row] = await db.update(goals)
    .set({ monthly_allocation: String(monthly_allocation) })
    .where(and(eq(goals.id, id), eq(goals.user_id, user.id)))
    .returning();
  return NextResponse.json(row);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await db.delete(goals).where(and(eq(goals.id, id), eq(goals.user_id, user.id)));
  return new NextResponse(null, { status: 204 });
}
