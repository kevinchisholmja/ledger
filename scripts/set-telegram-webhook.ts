#!/usr/bin/env tsx
/**
 * scripts/set-telegram-webhook.ts
 *
 * One-time script to register your Vercel deployment URL as the Telegram
 * webhook endpoint.
 *
 * Prerequisites:
 *   1. Deploy to Vercel first — Telegram requires a live HTTPS URL.
 *   2. Copy .env.local values into your shell environment, or use dotenv:
 *        npx dotenv -e .env.local -- npx tsx scripts/set-telegram-webhook.ts
 *
 * Usage:
 *   npx tsx scripts/set-telegram-webhook.ts
 *
 * To check current webhook info:
 *   npx tsx scripts/set-telegram-webhook.ts --info
 *
 * To delete the webhook:
 *   npx tsx scripts/set-telegram-webhook.ts --delete
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL; // e.g. https://ledger.vercel.app

if (!BOT_TOKEN) {
  console.error("❌  TELEGRAM_BOT_TOKEN is not set");
  process.exit(1);
}

const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;
const arg = process.argv[2];

async function getWebhookInfo() {
  const res = await fetch(`${TG}/getWebhookInfo`);
  const data = await res.json();
  console.log("ℹ️  Webhook info:\n", JSON.stringify(data.result, null, 2));
}

async function deleteWebhook() {
  const res = await fetch(`${TG}/deleteWebhook`, { method: "POST" });
  const data = await res.json();
  if (data.ok) {
    console.log("🗑️  Webhook deleted.");
  } else {
    console.error("❌  deleteWebhook failed:", data);
  }
}

async function setWebhook() {
  if (!APP_URL) {
    console.error(
      "❌  NEXT_PUBLIC_APP_URL is not set. Set it to your Vercel deployment URL."
    );
    process.exit(1);
  }
  if (!WEBHOOK_SECRET) {
    console.error("❌  TELEGRAM_WEBHOOK_SECRET is not set.");
    process.exit(1);
  }

  const webhookUrl = `${APP_URL.replace(/\/$/, "")}/api/telegram/webhook`;
  console.log(`🔗  Registering webhook: ${webhookUrl}`);

  const res = await fetch(`${TG}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: WEBHOOK_SECRET,
      // Only receive message updates — filter out noise
      allowed_updates: ["message"],
      // Drop pending updates from before deployment
      drop_pending_updates: true,
    }),
  });

  const data = await res.json();
  if (data.ok) {
    console.log("✅  Webhook registered successfully.");
    await getWebhookInfo();
  } else {
    console.error("❌  setWebhook failed:", JSON.stringify(data, null, 2));
    process.exit(1);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

(async () => {
  if (arg === "--info") {
    await getWebhookInfo();
  } else if (arg === "--delete") {
    await deleteWebhook();
  } else {
    await setWebhook();
  }
})();
