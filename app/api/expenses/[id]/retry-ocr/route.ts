import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { expenses, categories, buckets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { runOcr } from "@/lib/ocr";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  const [expense] = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.user_id, user.id)))
    .limit(1);

  if (!expense) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!expense.receipt_url) {
    return NextResponse.json({ error: "No receipt image to re-process" }, { status: 400 });
  }

  // Fetch user's lists for list-grounded OCR
  const [userCategories, userBuckets] = await Promise.all([
    db.select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.user_id, user.id)),
    db.select({ id: buckets.id, name: buckets.name })
      .from(buckets)
      .where(and(eq(buckets.user_id, user.id), eq(buckets.active, true))),
  ]);

  // Download the stored image
  const fileRes = await fetch(expense.receipt_url);
  if (!fileRes.ok) {
    return NextResponse.json({ error: "Could not fetch receipt image" }, { status: 502 });
  }
  const arrayBuffer = await fileRes.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuffer);

  const mimeType = expense.receipt_url.endsWith(".pdf") ? "application/pdf" : "image/jpeg";

  try {
    const { result, rawText } = await runOcr(imageBuffer, mimeType, { categories: userCategories, budgets: userBuckets });

    const [updated] = await db
      .update(expenses)
      .set({
        merchant: result.merchant,
        amount: result.amount != null ? String(result.amount) : null,
        currency: result.currency,
        date: result.date,
        category_id: result.category_id,
        bucket_id: result.bucket_id,
        notes: result.note,
        raw_ocr_text: rawText,
        status: "pending_review",
        updated_at: new Date(),
      })
      .where(and(eq(expenses.id, id), eq(expenses.user_id, user.id)))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Retry OCR failed:", err);
    return NextResponse.json({ error: "OCR failed" }, { status: 500 });
  }
}
