import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { buckets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  const { oldName, newName } = await req.json();

  if (!oldName || !newName || typeof oldName !== "string" || typeof newName !== "string") {
    return NextResponse.json({ error: "oldName and newName required" }, { status: 400 });
  }

  await db
    .update(buckets)
    .set({ group_name: newName.trim(), updated_at: new Date() })
    .where(and(eq(buckets.group_name, oldName), eq(buckets.user_id, user.id)));

  return NextResponse.json({ ok: true });
}
