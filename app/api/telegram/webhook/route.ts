import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import type { TelegramUpdate } from "@/types/telegram";
import { runOcr, type OcrResult } from "@/lib/ocr";
import { db } from "@/lib/db/client";
import { categories, buckets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Clients (initialised lazily so cold-start doesn't throw on missing env vars
// during build time — Vercel injects them at runtime)
// ---------------------------------------------------------------------------

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role — bypasses RLS
    { auth: { persistSession: false } }
  );
}

// ---------------------------------------------------------------------------
// Telegram helpers
// ---------------------------------------------------------------------------

const TG_BASE = () =>
  `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function sendTelegramMessage(chatId: number, text: string) {
  await fetch(`${TG_BASE()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function downloadTelegramFile(fileId: string): Promise<Buffer> {
  // 1. Get file path
  const pathRes = await fetch(`${TG_BASE()}/getFile?file_id=${fileId}`);
  const pathData = await pathRes.json();
  if (!pathData.ok) throw new Error(`getFile failed: ${JSON.stringify(pathData)}`);
  const filePath: string = pathData.result.file_path;

  // 2. Download binary
  const fileRes = await fetch(
    `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`
  );
  if (!fileRes.ok) throw new Error(`File download failed: ${fileRes.status}`);
  const arrayBuffer = await fileRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------

async function uploadReceiptImage(
  imageBuffer: Buffer,
  telegramUserId: number
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const filename = `${telegramUserId}/${randomUUID()}.jpg`;

  const { error } = await supabase.storage
    .from("receipts") // bucket must be created manually — see README
    .upload(filename, imageBuffer, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from("receipts").getPublicUrl(filename);
  return data.publicUrl;
}

async function insertExpense(row: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("expenses").insert(row);
  if (error) throw new Error(`DB insert failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // ── 1. Verify webhook secret ──────────────────────────────────────────────
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Parse update ───────────────────────────────────────────────────────
  let update: TelegramUpdate;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = update.message;
  if (!message) {
    // Telegram can send other update types (edited_message, etc.) — ignore
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id;
  const telegramUserId = message.from?.id ?? chatId;
  const userId = process.env.LEDGER_USER_ID!; // Supabase auth UUID
  const today = new Date().toISOString().split("T")[0];

  // Fetch user's category and budget lists once for list-grounded OCR
  const [userCategories, userBuckets] = await Promise.all([
    db.select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.user_id, userId)),
    db.select({ id: buckets.id, name: buckets.name })
      .from(buckets)
      .where(and(eq(buckets.user_id, userId), eq(buckets.active, true))),
  ]);

  // ── 3. Photo / document branch ────────────────────────────────────────────
  // Telegram sends photos as message.photo (compressed JPEG) or
  // message.document (when "Send as file" is chosen — PDF or raw image).
  let fileId: string | null = null;
  let fileMime = "image/jpeg"; // default for compressed Telegram photos

  if (message.photo && message.photo.length > 0) {
    fileId = message.photo[message.photo.length - 1].file_id;
  } else if (
    message.document &&
    (message.document.mime_type?.startsWith("image/") ||
      message.document.mime_type === "application/pdf")
  ) {
    fileId = message.document.file_id;
    fileMime = message.document.mime_type ?? "image/jpeg";
  }

  if (fileId) {
    let receiptUrl: string | null = null;
    let ocrResult: OcrResult | null = null;
    let rawOcrText: string | null = null;
    let status = "pending_ocr";

    // Download file
    let imageBuffer: Buffer;
    try {
      imageBuffer = await downloadTelegramFile(fileId);
    } catch (err) {
      console.error("Image download failed:", err);
      await sendTelegramMessage(chatId, "⚠️ Couldn't download your image. Please try again.");
      return NextResponse.json({ ok: true });
    }

    // Upload to Supabase Storage
    try {
      receiptUrl = await uploadReceiptImage(imageBuffer, telegramUserId);
    } catch (err) {
      console.error("Storage upload failed:", err);
    }

    // Run OCR with list-grounded prompting
    try {
      const ocr = await runOcr(imageBuffer, fileMime, { categories: userCategories, budgets: userBuckets });
      ocrResult = ocr.result;
      rawOcrText = ocr.rawText;
      status = "pending_review";
    } catch (err) {
      console.error("OCR failed:", err);
    }

    // Insert expense row
    try {
      await insertExpense({
        user_id: userId,
        source: "telegram",
        status,
        receipt_url: receiptUrl,
        raw_ocr_text: rawOcrText,
        merchant: ocrResult?.merchant ?? null,
        amount: ocrResult?.amount ?? null,
        currency: ocrResult?.currency ?? "JMD",
        date: ocrResult?.date ?? today,
        category_id: ocrResult?.category_id ?? null,
        bucket_id: ocrResult?.bucket_id ?? null,
        notes: ocrResult?.note ?? null,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("DB insert failed:", err);
      await sendTelegramMessage(chatId, "⚠️ Failed to save your receipt. Please try again.");
      return NextResponse.json({ ok: true });
    }

    // Reply
    if (ocrResult) {
      const currency = ocrResult.currency || "JMD";
      const amountDisplay = ocrResult.amount != null
        ? (currency === "JMD" ? `JMD ${ocrResult.amount.toLocaleString()}` : `${currency} ${ocrResult.amount}`)
        : "amount unknown";
      const catName = ocrResult.category_id
        ? (userCategories.find((c) => c.id === ocrResult!.category_id)?.name ?? "Uncategorised")
        : "Uncategorised";
      await sendTelegramMessage(
        chatId,
        `✅ Got it — ${ocrResult.merchant} • ${amountDisplay} • ${catName}. Open Ledger to confirm.`
      );
    } else {
      await sendTelegramMessage(chatId, "📎 Image saved. OCR is pending — open Ledger to review and categorise.");
    }

    return NextResponse.json({ ok: true });
  }

  // ── 4. Text-only branch ───────────────────────────────────────────────────
  if (message.text) {
    const text = message.text.trim();

    if (text.startsWith("/")) {
      await sendTelegramMessage(
        chatId,
        "👋 Send me a receipt photo to log an expense, or type a description to add a manual entry."
      );
      return NextResponse.json({ ok: true });
    }

    try {
      await insertExpense({
        user_id: userId,
        source: "manual",
        status: "pending_review",
        receipt_url: null,
        raw_ocr_text: text,
        merchant: null,
        amount: null,
        currency: "JMD",
        date: today,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Manual insert failed:", err);
      await sendTelegramMessage(chatId, "⚠️ Couldn't save that. Please try again.");
      return NextResponse.json({ ok: true });
    }

    await sendTelegramMessage(chatId, "📝 Manual entry saved. Open Ledger to fill in the details.");
    return NextResponse.json({ ok: true });
  }

  // Unhandled message type — acknowledge silently
  return NextResponse.json({ ok: true });
}
