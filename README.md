# Ledger

A personal finance tracker. Send a receipt photo to a Telegram bot — Claude Vision
reads it, extracts the merchant, amount, and category, and stores it. Review and
confirm expenses in the PWA dashboard. Track spending against budget buckets.

**Live:** https://ledger-gules-seven.vercel.app  
**Stack:** Next.js 16, Tailwind v4, Drizzle ORM, Supabase, Anthropic Claude, Telegram Bot API  
**Platform:** Vercel (production) · Supabase (database + storage + auth)

---

**Status:** Active development. Core receipt ingestion, AI extraction, expense review, and dashboard workflows are implemented. Additional polish, reporting, budget features, and reliability improvements are ongoing.

---

## How it works

```
Telegram bot
  ↓  photo / PDF / text message
Webhook (app/api/telegram/webhook/)
  ↓  Claude Vision OCR (lib/ocr.ts)
Supabase Storage (receipt image) + Postgres (expense row, status: pending_review)
  ↓
PWA dashboard — review, confirm, categorise
  ↓
Expense history + budget tracking
```

---

## Running locally

**Prerequisites:** Node.js 20+, a Supabase project, an Anthropic API key, a Telegram bot token.

```bash
git clone https://github.com/kevinchisholmja/ledger.git
cd ledger
npm install
cp .env.local.example .env.local   # fill in your values
npm run dev
```

Open http://localhost:3000 — you will be redirected to `/login`.

Environment variables required: see `docs/env-vars.md`.

---

## Project documentation

| Document | What it covers |
|---|---|
| `docs/build.md` | 40,000-foot view — one section per phase, key facts per phase |
| `docs/architecture.md` | System design, data flow, component map |
| `docs/runbook.md` | Deployment, webhook registration, debugging, known issues |
| `docs/env-vars.md` | Every environment variable, where to get it |
| `activity/README.md` | How the activity log works |
| `activity/ToDo.md` | What is planned but not yet started |
| `playbook/README.md` | The development methodology behind this project |

---

## Project activity log

This project uses `activity/` as its issue tracker — a chronological record of
everything built, decided, and fixed. No Linear, no Jira, no Notion required.

```
activity/
  ToDo.md                    current planned work
  phases/                    goal + scope + decisions per phase
  2026/                      dated activity files — the full chronological record
```

Read `activity/README.md` for the full conventions.
Read `activity/phases/` to understand what each phase set out to do.
Read `activity/2026/` to see everything that happened in order.

---

## Key rules for any AI agent working on this codebase

See `CLAUDE.md` and `AGENTS.md` at the project root. Critical points:

- Next.js version is **16.2.6** — not 14, not 15. APIs differ.
- Tailwind is **v4** — import syntax is `@import "tailwindcss"`, not `@tailwind base`.
- Database queries use **Drizzle ORM** — never Supabase JS for DB queries.
- Every Drizzle query must include **`WHERE user_id = X`** — service role bypasses RLS.
- Postgres connection uses port **6543** (pooler) with **`prepare: false`**.
- `expenses.amount` is **nullable** — do not add `.notNull()` in the schema.
- The proxy file is **`proxy.ts`** — Next.js 16 renamed `middleware.ts`.
