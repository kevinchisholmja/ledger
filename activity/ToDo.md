# ToDo

What is planned but not yet started. When work begins on an item, it moves to the
dated activity file for that day. This file is always forward-looking.

For the complete history of everything already done, see `activity/2026/`.
For the context behind each phase, see `activity/phases/`.

---

## Phase 4 — not yet defined

[ ] To be scoped. Add goal and tasks to activity/phases/phase-4-name.md when ready.

---

## Known improvements / deferred work

- [ ] Replace placeholder PWA icons (public/icon-192.png, public/icon-512.png) with
      real branded icons — currently solid zinc-950 squares generated programmatically
- [ ] Add NEXT_PUBLIC_SUPABASE_ANON_KEY to Vercel preview environment (currently only
      on production — preview deployments will fail auth)
- [ ] categories table is empty — no seed data. User must create categories manually
      via POST /api/categories before category_id matching on review will work
- [ ] docs/architecture.md — review and update to reflect Phase 3 Drizzle additions
- [ ] Set up custom SMTP in Supabase (Authentication → SMTP Settings) to bypass the
      2 emails/hour shared SMTP cap — use Resend or similar
