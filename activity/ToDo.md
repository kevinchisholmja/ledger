# ToDo

What is planned but not yet started. When work begins on an item, it moves to the
dated activity file for that day. This file is always forward-looking.

For the complete history of everything already done, see `activity/2026/`.
For the context behind each phase, see `activity/phases/`.

---

## Phase 4 — buckets_summary + iOS Shortcut

Scoped 2026-05-24. Brief received from War Room.

→ `activity/phases/phase-4-shortcut.md` — full scope and constraints

**Part A — Dashboard redesign**
- [ ] Wire `buckets_summary` view to `app/page.tsx` (replace direct `buckets` query)
- [ ] Redesign budget cards: progress bar, month_spent, month_remaining, year_spent
      Copilot-style layout — progress bar coloured green/amber/red by spend %
- [ ] Replace all inline `J$${...}` currency formatting with `lib/format.ts` helpers

**Part B — iOS Shortcut endpoint**
- [ ] `POST /api/shortcut/upload` — multipart image/PDF, auth via x-shortcut-secret
- [ ] Add `SHORTCUT_SECRET` to `.env.local` and Vercel (generate: `openssl rand -hex 32`)

**Part C — iOS Shortcut setup**
- [ ] `docs/ios-shortcut.md` — step-by-step guide for building the Shortcut on iPhone

**Part D — Housekeeping**
- [ ] Append Phase 4 additions to `CLAUDE.md`

---

## Known improvements / deferred work

- [ ] Replace placeholder PWA icons (public/icon-192.png, public/icon-512.png) with
      real branded icons — currently solid zinc-950 squares generated programmatically
- [ ] Add NEXT_PUBLIC_SUPABASE_ANON_KEY to Vercel preview environment (currently only
      on production — preview deployments will fail auth)
- [ ] categories table is empty — no seed data. User must create categories manually
      via the /budgets page before category_id matching on review will work
- [ ] docs/architecture.md — review and update to reflect Phase 3 Drizzle additions
      and Phase 4 terminology refactor (bucket → budget, expenses → transactions)
- [ ] Set up custom SMTP in Supabase (Authentication → SMTP Settings) to bypass the
      2 emails/hour shared SMTP cap — use Resend or similar
- [ ] Full UI redesign pass — Copilot-style design system. Phase 4 starts this with
      the budget cards. Full pass (transactions list, review queue, budgets page)
      deferred to after P4.
