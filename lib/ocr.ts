import Anthropic from "@anthropic-ai/sdk";

export interface OcrLists {
  categories: { id: string; name: string }[];
  budgets: { id: string; name: string }[];
}

export interface OcrResult {
  merchant: string;
  amount: number | null;
  currency: string;
  date: string;
  category_id: string | null;
  bucket_id: string | null;
  note: string | null;
}

function buildPrompt(lists: OcrLists): string {
  const catJson = JSON.stringify(lists.categories.map((c) => ({ id: c.id, name: c.name })));
  const budgetJson = JSON.stringify(lists.budgets.map((b) => ({ id: b.id, name: b.name })));

  return `You are a receipt parser. Extract data from this receipt and match it to the user's existing categories and budgets.

CATEGORIES (pick one):
${catJson}

BUDGETS (pick one):
${budgetJson}

Return ONLY valid JSON — no markdown fences, no explanation, no extra keys.

Schema:
{
  "merchant": "string — business name shown on receipt",
  "amount": number or null — total amount paid (numeric only, no currency symbol),
  "currency": "string — 3-letter ISO code, default JMD if unclear",
  "date": "string — ISO 8601 date YYYY-MM-DD, use today if not shown",
  "category_id": "string or null — id from the CATEGORIES list that best fits this purchase, null if no good match",
  "bucket_id": "string or null — id from the BUDGETS list that best fits this purchase, null if no good match",
  "note": "string or null — ONLY if no good category or budget match exists, suggest a new name in one sentence (e.g. \\"Consider adding a Pet Supplies category\\"). Otherwise null."
}

Rules:
- Pick the single best match for category_id and bucket_id. Use null if confidence is below 70%.
- category_id and bucket_id may differ — a receipt from a gym could be category \\"Sports & Fitness\\" and budget \\"Sports & Fitness\\".
- Do not invent IDs. Only use IDs from the lists above.`;
}

export async function runOcr(
  imageBuffer: Buffer,
  mimeType: string = "image/jpeg",
  lists: OcrLists = { categories: [], budgets: [] }
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
        content: [contentBlock, { type: "text", text: buildPrompt(lists) }],
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
