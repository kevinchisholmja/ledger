# Telegram Webhook

## Registering the webhook

Run once after each production URL change:

```bash
npx dotenv -e .env.local -- npx tsx scripts/set-telegram-webhook.ts

# Check current webhook info
npx dotenv -e .env.local -- npx tsx scripts/set-telegram-webhook.ts --info

# Remove webhook (e.g. to switch to polling for local dev)
npx dotenv -e .env.local -- npx tsx scripts/set-telegram-webhook.ts --delete
```

## Testing the webhook manually

```bash
# Simulate a text message (replace YOUR_SECRET with TELEGRAM_WEBHOOK_SECRET value)
curl -X POST https://ledger-gules-seven.vercel.app/api/telegram/webhook \
  -H "Content-Type: application/json" \
  -H "x-telegram-bot-api-secret-token: YOUR_SECRET" \
  -d '{"update_id":1,"message":{"message_id":1,"chat":{"id":123,"type":"private"},"from":{"id":123,"is_bot":false,"first_name":"Test"},"date":1700000000,"text":"test entry"}}'

# Expected response
{"ok":true}

# Then verify a row appeared in Supabase:
# Dashboard → Table Editor → expenses → most recent row
```

## Known issues

**Telegram sends PDFs as documents, not photos.**
When a user taps "Send as file", Telegram delivers `message.document`, not `message.photo`.
The webhook handles both — but Telegram's file size limit for bots is 20 MB. Large PDFs will fail to download.
