# Environment Variables

All variables must be set in Vercel (production + development) and in `.env.local` for local dev.

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL — `https://evdbqegscpeaabzzcwvw.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role JWT — bypasses RLS; keep secret |
| `ANTHROPIC_API_KEY` | Yes | From console.anthropic.com → API Keys |
| `TELEGRAM_BOT_TOKEN` | Yes | From @BotFather — format `123456789:AAF...` |
| `TELEGRAM_WEBHOOK_SECRET` | Yes | Random hex string you generate; Telegram echoes it back on every update so the server can verify authenticity |
| `NEXT_PUBLIC_APP_URL` | Yes | Production URL — `https://ledger-gules-seven.vercel.app` |
| `LEDGER_USER_ID` | Yes | Your Supabase Auth UUID — Supabase Dashboard → Authentication → Users |

## Adding / updating a variable

```bash
vercel env add VARIABLE_NAME production --value "value" --yes
vercel env add VARIABLE_NAME development --value "value" --yes
```

After changing any variable, redeploy:

```bash
git checkout main
vercel --prod --yes
```

## Getting the anon key

The anon key is safe to use client-side (it only grants access via RLS policies):

```
Supabase Dashboard
→ Project: ledger
→ Left sidebar: Project Settings (gear icon)
→ API
→ "Project API keys" section
→ Copy "anon public"
```

Or via CLI (already run, shown earlier in session):
```bash
supabase projects api-keys --project-ref evdbqegscpeaabzzcwvw
```

The anon key starts with `eyJhbGci...` and is the row labelled `anon`.
