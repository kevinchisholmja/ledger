# Local Development (localhost)

---

## Starting dev servers

| Framework / Tool | Command | Default URL |
|---|---|---|
| Next.js | `npm run dev` | http://localhost:3000 |
| Vite (React, Vue) | `npm run dev` | http://localhost:5173 |
| Express / Node | `node server.js` | http://localhost:3000 (set in code) |
| Python / FastAPI | `uvicorn main:app --reload` | http://localhost:8000 |
| Python / Flask | `flask run` | http://localhost:5000 |
| Supabase local | `supabase start` | http://localhost:54321 (API) |
| Supabase Studio | (started with supabase) | http://localhost:54323 |
| Drizzle Studio | `npx drizzle-kit studio` | https://local.drizzle.studio |

---

## Common ports

| Port | Typical use |
|---|---|
| 3000 | Next.js, Express default |
| 5173 | Vite |
| 5432 | PostgreSQL (direct) |
| 6543 | Supabase pooler |
| 8000 | Python / FastAPI |
| 54321 | Supabase local API |
| 54322 | Supabase local Postgres |
| 54323 | Supabase Studio |

---

## Port already in use

```bash
lsof -i :3000                     # find what is using port 3000
kill -9 <PID>                     # kill it
```

Or just use a different port:
```bash
npm run dev -- --port 3001        # Next.js on 3001
PORT=3001 npm run dev             # alternative
```

---

## Environment variables for local dev

Each service needs its own `.env.local` (for Next.js) or `.env` file.

```
# .env.local — Next.js reads this automatically in dev
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321       # local Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co     # remote Supabase
NEXT_PUBLIC_APP_URL=http://localhost:3000             # important for auth redirects
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

**Never commit `.env.local` or `.env` to git.**  
Commit `.env.local.example` with placeholder values so others know what to fill in.

---

## Testing auth locally (magic links / OAuth)

The magic link will redirect to wherever `NEXT_PUBLIC_APP_URL` points.

For local auth to work:
1. Set `NEXT_PUBLIC_APP_URL=http://localhost:3000` in `.env.local`
2. Add `http://localhost:3000/api/auth/callback` to Supabase → Authentication →
   URL Configuration → Redirect URLs
3. Restart the dev server after changing env vars

Keep a second `.env.local.production` (gitignored) with production values to
quickly switch back when needed.

---

## Exposing localhost to the internet (tunnels)

Useful for testing webhooks (Telegram, Stripe, etc.) locally.

```bash
# ngrok (most common)
brew install ngrok
ngrok http 3000                   # creates a public URL → http://localhost:3000

# Cloudflare Tunnel (free, no account needed for quick use)
npx cloudflared tunnel --url http://localhost:3000

# VS Code port forwarding
# Ports panel → Forward a Port → choose 3000 → make it public
```

When testing a Telegram webhook locally:
```bash
ngrok http 3000
# Take the https URL and register it:
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://xxx.ngrok.io/api/telegram/webhook&secret_token=<SECRET>"
```

Remember to re-register the webhook to your production URL when done.

---

## Inspecting HTTP requests

**In browser:**
DevTools → Network tab → click any request → Headers / Response / Preview

**From terminal:**
```bash
curl -X POST http://localhost:3000/api/my-route \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'

curl -v http://localhost:3000/api/my-route    # -v shows headers and status
```
