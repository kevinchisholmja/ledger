# Vercel CLI

> ## The Dashboard always shows the full error — that's where you should go first for a [cause]: or stack trace.

Install: `npm i -g vercel`  
Authenticate: `vercel login`  
Link a project: `vercel link` (run once in the project root)

---

## Deploy

```bash
vercel              # preview deployment (your current branch)
vercel --prod       # production deployment
```

Any env vars added to Vercel after a deployment are NOT in that build.  
`NEXT_PUBLIC_*` vars are baked at compile time. **Always redeploy after adding them.**

---

## Environment variables

```bash
vercel env ls                          # list all vars and which environments they're in
vercel env add NAME                    # add a var (prompts for value and environment)
vercel env add NAME production         # add directly to production
vercel env rm NAME                     # remove a var
vercel env pull                        # download to .env.local (sensitive vars show as empty)
vercel env pull --environment preview  # pull preview vars instead
```

Environments: `production` · `preview` · `development`

`NEXT_PUBLIC_*` vars must be set for every environment where they're needed.
If they're only on production, preview deployments will get `undefined`.

---

## Pulling logs

```bash
vercel logs https://your-app.vercel.app              # recent logs
vercel logs https://your-app.vercel.app --since 1h   # last hour
vercel logs https://your-app.vercel.app --since 30m  # last 30 minutes
```

The CLI truncates long error messages. For the full message:
**Vercel Dashboard → Project → Functions** tab — click any invocation to see
the complete error, request, and response.

For a specific deployment URL (not the alias):
```bash
vercel logs https://your-app-abc123.vercel.app
```

---

## Domains and aliases

```bash
vercel domains ls               # list domains
vercel alias set <url> <alias>  # point a deployment URL to a custom alias
```

---

## Inspect a deployment

```bash
vercel inspect <url>   # show deployment metadata, build logs, env
```

---

## Common patterns

**Env var added but app still using old value:**
The build is stale. Run `vercel --prod` to trigger a fresh build.

**Preview deployment failing auth:**
Check that all `NEXT_PUBLIC_*` vars are also set on `preview`, not just `production`.

**"Command not found: vercel":**
Run `npm i -g vercel` or use `npx vercel`.
