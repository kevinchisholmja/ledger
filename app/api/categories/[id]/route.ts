import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;
  const { name, icon } = await req.json();
  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (icon !== undefined) patch.icon = icon || null;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }
  const [updated] = await db
    .update(categories)
    .set(patch as never)
    .where(and(eq(categories.id, id), eq(categories.user_id, user.id)))
    .returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  const [deleted] = await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.user_id, user.id)))
    .returning({ id: categories.id });

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
