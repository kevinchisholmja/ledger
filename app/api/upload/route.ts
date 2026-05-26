import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { requireUser } from "@/lib/auth";
import { runOcr } from "@/lib/ocr";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
  "application/pdf",
];

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const user = await requireUser();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const mimeType = file.type || "image/jpeg";
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return NextResponse.json({ error: `Unsupported file type: ${mimeType}` }, { status: 415 });
  }

  const supabase = getSupabaseAdmin();
  const today = new Date().toISOString().split("T")[0];
  const ext = mimeType === "application/pdf" ? "pdf" : mimeType.split("/")[1];
  const storagePath = `${user.id}/${randomUUID()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuffer);

  let receiptUrl: string | null = null;
  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(storagePath, imageBuffer, { contentType: mimeType, upsert: false });

  if (!uploadError) {
    const { data } = supabase.storage.from("receipts").getPublicUrl(storagePath);
    receiptUrl = data.publicUrl;
  } else {
    console.error("Storage upload error:", uploadError.message);
  }

  let status = "pending_ocr";
  let ocrResult = null;
  let rawOcrText: string | null = null;

  try {
    const ocr = await runOcr(imageBuffer, mimeType);
    ocrResult = ocr.result;
    rawOcrText = ocr.rawText;
    status = "pending_review";
  } catch (err) {
    console.error("OCR failed:", err);
  }

  const { error: insertError } = await supabase.from("expenses").insert({
    user_id: user.id,
    source: "manual",
    status,
    receipt_url: receiptUrl,
    raw_ocr_text: rawOcrText,
    merchant: ocrResult?.merchant ?? null,
    amount: ocrResult?.amount ?? null,
    currency: ocrResult?.currency ?? "JMD",
    date: ocrResult?.date ?? today,
    ai_suggested_category: ocrResult?.ai_suggested_category ?? null,
    created_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error("DB insert error:", insertError.message);
    return NextResponse.json({ error: "Failed to save expense" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status });
}
