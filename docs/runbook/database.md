# Database

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
**Supabase Dashboard → SQL Editor → New query**

## Known issues

**Port 5432 / 6543 blocked.**
`supabase db push` connects directly to Postgres. Some networks (corporate, shared Wi-Fi)
block these ports. Workaround: use the Supabase Dashboard SQL Editor or the Management
API query endpoint above.

**`amount` is nullable for pending entries.**
Manual text entries and failed-OCR receipts are stored with `amount = NULL` and
`status = pending_review`. The user must fill in the amount in the review UI before
the expense is considered confirmed.
