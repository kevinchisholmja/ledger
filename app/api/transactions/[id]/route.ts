import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { transactions, type NewTransaction } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  const body = await req.json();

  const allowed = [
    "payee_name",
    "amount",
    "currency",
    "date",
    "invoice_date",
    "reference_num",
    "bucket_id",
    "category_id",
    "notes",
    "memo",
    "status",
    "cleared",
    "reconciled",
    "direction",
    "type",
    "flagged",
  ] as const;

  const patch: Partial<NewTransaction> = {};
  for (const key of allowed) {
    if (key in body) (patch as Record<string, unknown>)[key] = body[key];
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const [updated] = await db
    .update(transactions)
    .set({ ...patch, updated_at: new Date() })
    .where(and(eq(transactions.id, id), eq(transactions.user_id, user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  const [deleted] = await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.user_id, user.id)))
    .returning({ id: transactions.id });

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
