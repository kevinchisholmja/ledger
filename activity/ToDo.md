# ToDo

What is planned but not yet started. When work begins on an item, it moves to the
dated activity file for that day. This file is always forward-looking.

For the complete history of everything already done, see `activity/2026/`.
For the context behind each phase, see `activity/phases/`.

---

## Documentation system — 2026-05-24 (in progress)

- [x] Design activity/ directory structure
- [x] Write activity/README.md
- [x] Write activity/ToDo.md
- [x] Write activity/2026/2026-05-24.md — Phase 1 + Phase 2
- [x] Write activity/2026/2026-05-24b.md — Phase 3 + documentation design
- [x] Write activity/phases/phase-1-schema.md
- [x] Write activity/phases/phase-2-telegram.md
- [x] Write activity/phases/phase-3-dashboard.md
- [x] Write docs/build.md — 40,000-foot view
- [x] Replace README.md — remove Next.js default, write proper project entry point
- [x] Create playbook/ — methodology document (to transfer to kevinchisholmja/playbook)

---

## Phase 4 — not yet defined

[ ] To be scoped. Add goal and tasks to activity/phases/phase-4-name.md when ready.

---

## Known improvements / deferred work

- [ ] Replace placeholder PWA icons (public/icon-192.png, public/icon-512.png) with
      real branded icons — currently solid zinc-950 squares generated programmatically
- [ ] Add NEXT_PUBLIC_SUPABASE_ANON_KEY to Vercel preview environment (currently only
      on production — preview deployments will fail auth)
- [ ] Supabase auth redirect URL — confirm
      https://ledger-gules-seven.vercel.app/api/auth/callback is in the allow-list
      under Authentication → URL Configuration in the Supabase dashboard
- [ ] categories table is empty — no seed data. User must create categories manually
      via POST /api/categories before category_id matching on review will work
- [ ] docs/architecture.md — review and update to reflect Phase 3 Drizzle additions
