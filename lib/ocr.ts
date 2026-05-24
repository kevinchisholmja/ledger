import Anthropic from "@anthropic-ai/sdk";

export interface OcrResult {
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  ai_suggested_category: string;
  confidence: number;
}

const OCR_PROMPT = `You are a receipt parser. Analyse the receipt image and extract the following fields.
Return ONLY valid JSON — no markdown fences, no explanation, no extra keys.

Schema:
{
  "merchant": "string — business name",
  "amount": number — total amount paid (numeric, no currency symbol),
  "currency": "string — 3-letter ISO code, default JMD if unclear",
  "date": "string — ISO 8601 date (YYYY-MM-DD), default to today if unclear",
  "ai_suggested_category": "string — one of: Food & Drink, Groceries, Transport, Utilities, Shopping, Health, Entertainment, Travel, Business, Other",
  "confidence": number — 0.0–1.0 reflecting your confidence in the extraction
}`;

export async function runOcr(
  imageBuffer: Buffer,
  mimeType: string = "image/jpeg"
): Promise<{ result: OcrResult; rawText: string }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const base64 = imageBuffer.toString("base64");

  const contentBlock =
    mimeType === "application/pdf"
      ? ({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        } as const)
      : ({
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: base64,
          },
        } as const);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [contentBlock, { type: "text", text: OCR_PROMPT }],
      },
    ],
  });

  const rawText = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  const result: OcrResult = JSON.parse(rawText.trim());
  return { result, rawText };
}
