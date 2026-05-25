# Deploying

## Deploy to production

```bash
git push origin main
```

Vercel auto-deploys on every push to `main`. No manual `vercel --prod` needed.

## Preview deploy

```bash
git push origin your-branch
```

Vercel auto-deploys branches to a preview URL — check the Vercel dashboard for the link.

## Checking logs

```bash
# Recent production logs
vercel logs "https://ledger-gules-seven.vercel.app" --since 1h --expand

# Live tail
vercel logs "https://ledger-gules-seven.vercel.app" --follow

# Errors only
vercel logs "https://ledger-gules-seven.vercel.app" --level error --since 24h --expand
```
