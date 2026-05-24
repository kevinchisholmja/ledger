# Runbook — Operating Ledger

## Deploying

```bash
# Deploy to production (from main branch)
git checkout main
git merge develop
git push origin main
vercel --prod --yes

# Preview deploy (from develop)
git checkout develop
git push origin develop   # Vercel auto-deploys to a preview URL
```

## Registering the Telegram webhook

Run once after each production URL change:

```bash
npx dotenv -e .env.local -- npx tsx scripts/set-telegram-webhook.ts

# Check current webhook info
npx dotenv -e .env.local -- npx tsx scripts/set-telegram-webhook.ts --info

# Remove webhook (e.g. to switch to polling for local dev)
npx dotenv -e .env.local -- npx tsx scripts/set-telegram-webhook.ts --delete
```

## Checking logs

```bash
# Recent production logs
vercel logs "https://ledger-gules-seven.vercel.app" --since 1h --expand

# Live tail
vercel logs "https://ledger-gules-seven.vercel.app" --follow

# Errors only
vercel logs "https://ledger-gules-seven.vercel.app" --level error --since 24h --expand
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

## Applying a new migration

Direct DB connections (port 5432/6543) may be blocked on some networks.
Use the Supabase Management API instead:

```bash
TOKEN=$(security find-generic-password -a "supabase" -w | base64 -d)  # macOS keychain
curl -s -X POST "https://api.supabase.com/v1/projects/evdbqegscpeaabzzcwvw/database/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$(cat supabase/migrations/YOUR_FILE.sql | tr '\n' ' ')\"}"
```

Or paste the SQL directly into:
Supabase Dashboard → SQL Editor → New query

## Known issues / gotchas

### Port 5432 / 6543 blocked
`supabase db push` connects directly to Postgres. Some networks (corporate, shared Wi-Fi) block these ports. Workaround: use the Supabase Dashboard SQL Editor or the Management API query endpoint above.

### Telegram sends PDFs as documents, not photos
When a user taps "Send as file", Telegram delivers `message.document`, not `message.photo`. The webhook now handles both — but Telegram's file size limit for bots is 20 MB. Large PDFs will fail to download.

### amount is nullable for pending entries
Manual text entries and failed-OCR receipts are stored with `amount = NULL` and `status = pending_review`. The user must fill in the amount in the review UI before the expense is considered confirmed.

## Incident log

| Date | Issue | Root cause | Fix |
|---|---|---|---|
| 2026-05-24 | "Couldn't save that" on all text messages | `amount NOT NULL` violated by manual entries (amount is unknown until review) | Migration 20240004: dropped NOT NULL on expenses.amount |
| 2026-05-24 | PDF receipts silently ignored | Webhook only checked `message.photo`, not `message.document` | Updated webhook to detect document MIME type and route to same OCR flow |
