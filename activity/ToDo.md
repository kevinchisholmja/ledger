# ToDo

What is planned but not yet started. When work begins on an item, it moves to the
dated activity file for that day. This file is always forward-looking.

For the complete history of everything already done, see `activity/2026/`.
For the context behind each phase, see `activity/phases/`.

---

## Known improvements / deferred work

### Infrastructure
- [ ] Run `supabase/migrations/20240006_add_long_budget_periods.sql` in Supabase Dashboard SQL editor
      — needed to enable creating biennial/triennial/quinquennial/decennial budgets
- [ ] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel **preview** environment (currently only on
      production — preview deployments will fail auth)
- [ ] Set up custom SMTP in Supabase (Authentication → SMTP Settings) to bypass the
      2 emails/hour shared SMTP cap — use Resend or similar

### UI / UX
- [x] Fix logout cursor pointer on hover — added `cursor-pointer` to Sign out buttons
      in `Sidebar.tsx` and `MobileNav.tsx`
- [ ] Replace placeholder PWA icons (`public/icon-192.png`, `public/icon-512.png`) with real
      branded icons — currently solid zinc-950 squares
- [ ] Mobile summary panel — right summary panel is hidden on mobile (`hidden md:flex`).
      Add a collapsible summary card below Recent on small screens.
- [ ] Fortnight payday anchor — currently splits month at 1–14 / 15–end.
      Add a user setting for custom payday start date.
- [ ] Full UI design pass on `/review` and `/transactions` — deferred from P5

### Data
- [x] Seed categories — completed (preset seeding has been set up to auto-seed 30 categories + 25 budgets on first visit).
- [ ] "Left Over from Last Month" row in right summary panel — currently shows placeholder.
      Requires querying prior period's remaining balance.

### Future phases
- [ ] Budget groups / category groups (like YNAB's "Bills", "Needs", "Wants") — collapse/expand
- [ ] Transactions page: filter by budget, category, date range, status
- [ ] CSV import for bank statements (bank_entries table exists, UI not built)
- [ ] Reconciliation flow — match bank_entries to expenses
