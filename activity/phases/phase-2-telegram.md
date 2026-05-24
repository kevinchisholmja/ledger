# Phase 2 — Telegram Webhook + Claude Vision OCR

**Status:** Complete  
**Date:** 2026-05-24  
**Full activity log:** activity/2026/2026-05-24.md

---

## Goal

Accept receipt photos and PDFs from a Telegram bot, extract structured expense data
using Claude Vision OCR, and store it in Supabase. No UI yet — purely a data
ingestion pipeline. The goal is a working Telegram → OCR → database flow that
can be tested by sending a receipt photo to the bot.

---

## Scope

**In:**
- Telegram webhook endpoint (Next.js Route Handler)
- Claude Vision OCR with structured JSON output
- Supabase Storage upload for receipt images
- Supabase DB insert for expense rows
- TypeScript types for Telegram update objects
- One-time webhook registration script
- Basic text-entry fallback (typed descriptions without a photo)

**Out:**
- No UI — review and confirmation happen in Phase 3
- No auth on the webhook — single-user app, identity via LEDGER_USER_ID env var
- No retry mechanism in the UI — retry-ocr API route built in Phase 3

---

## Files created

```
app/api/telegram/webhook/route.ts    main handler — photo + document + text branches
types/telegram.ts                    TelegramUpdate, TelegramMessage, TelegramPhotoSize, etc.
scripts/set-telegram-webhook.ts      one-time webhook registration
```

---

## Key decisions

**Single-user via `LEDGER_USER_ID`.**
All expenses are pinned to a single Supabase auth UUID from an environment variable.
The webhook does not require the Telegram user to have a Supabase account.
Authentication of the webhook itself is via `x-telegram-bot-api-secret-token` header.

**Claude model: `claude-sonnet-4-6`.**
Accurate enough for structured receipt extraction. Significantly cheaper than Opus.
The prompt returns JSON only — no markdown fences — which is reliable with Sonnet
for well-constrained extraction tasks.

**PDF support via `type: "document"` API block.**
Telegram delivers PDFs as `message.document`, not `message.photo`. The Anthropic API
requires PDFs to use a `document` content block — sending a PDF as an `image` block
returns a 400 error. MIME type detected at runtime to route correctly.

**Fail-soft OCR.**
If OCR fails (API error, malformed JSON response, etc.), the expense is still inserted
with `status: "pending_ocr"` and `amount: null`. The image is already in Storage.
The user can retry OCR from the review UI (Phase 3).

**Storage path: `{telegramUserId}/{uuid}.jpg`.**
No bucket name prefix in the path — `supabase.storage.from("receipts")` already
includes the bucket name in the URL. Adding it to the filename caused double-prefix.

---

## Bugs encountered

All bugs found and fixed during this phase:

1. **Deprecated Claude model** — `claude-sonnet-4-20250514` returned 404.
   Updated to `claude-sonnet-4-6`.

2. **PDFs silently ignored** — webhook only checked `message.photo`.
   Added `message.document` branch with MIME type detection.

3. **Storage URL double-prefixed** — filename `receipts/uuid.jpg` + bucket `receipts`
   = `receipts/receipts/uuid.jpg` in the public URL.
   Fixed filename to `{telegramUserId}/{uuid}.jpg`.

4. **`amount NOT NULL` constraint violated** — manual text entries have no amount.
   Migration 20240004 drops NOT NULL on `expenses.amount`.

---

## Outcome

Working Telegram → OCR → Supabase pipeline.
Photos and PDFs both produce structured expense rows with merchant, amount, currency,
date, and AI-suggested category. Manual text entries create a row with status
`pending_review` and null amount for the user to fill in during review.
