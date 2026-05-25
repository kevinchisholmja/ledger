# Supabase CLI

> ## The Dashboard always shows the full error — that's where you should go first for a [cause]: or stack trace.

Install: `npm i -g supabase`  
Authenticate: `supabase login`  
Link to a remote project: `supabase link --project-ref <project-id>`  
Project ref is the ID in your Supabase project URL: `https://supabase.com/dashboard/project/<ref>`

---

## Local development

```bash
supabase start          # start local Postgres + Auth + Storage + Studio
supabase stop           # stop everything
supabase status         # show local URLs and keys
```

Local Studio (visual DB browser): http://localhost:54323  
Local API: http://localhost:54321  
Local DB: postgresql://postgres:postgres@localhost:54322/postgres

Your `.env.local` should point to local URLs when developing locally:
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase status>
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

---

## Migrations

```bash
supabase migration new <name>          # create a new empty migration file
supabase db push                       # apply local migrations to remote project
supabase db pull                       # pull remote schema into a new migration file
supabase db reset                      # reset local DB and re-run all migrations
```

Migration files live in `supabase/migrations/` as `YYYYMMDD_name.sql`.  
Always write migrations as plain SQL. Never edit a migration that has already been applied.

**Applying a migration manually (when CLI is blocked):**
```bash
node -e "
const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL, { prepare: false });
sql\`YOUR SQL HERE\`.then(() => { console.log('done'); sql.end(); });
"
```

---

## Pulling logs

> **The Dashboard always shows the full error — that's where you should go first for a `[cause]:` or stack trace.**

**Via CLI:**
```bash
supabase logs --project-ref <ref>              # recent API logs
supabase logs --project-ref <ref> --type auth  # auth logs only
```

Log types: `api` · `auth` · `database` · `edge-function` · `storage` · `realtime`

**Via Dashboard (more reliable):**
Supabase Dashboard → your project → **Logs** (left sidebar)
- API logs: all requests to your project's REST/GraphQL API
- Auth logs: sign-in attempts, magic link sends, errors
- Database logs: slow queries, errors, connections
- Edge Function logs: output from Edge Functions

Auth errors (like rate limit, redirect mismatch) always appear in **Auth logs**.  
Database column errors always appear in **Database logs**.

---

## Common patterns

**Rate limit on magic link emails:**
Dashboard → Authentication → Rate Limits → "Rate limit for sending emails" (default: 2/h on free tier).
To remove the cap: Authentication → SMTP Settings → configure custom SMTP (e.g. Resend).

**Magic link redirecting to wrong URL:**
Dashboard → Authentication → URL Configuration → check Site URL and Redirect URLs.
`emailRedirectTo` must be in the Redirect URLs allow-list.

**Column does not exist:**
Schema mismatch between your ORM and the real database. Run the correct migration.
Check actual table structure: Dashboard → Table Editor → select the table.

**RLS blocking queries:**
If you use the service role key, RLS is bypassed entirely. Always add `WHERE user_id = X`
to every query when using the service role — there is no database-level safety net.
