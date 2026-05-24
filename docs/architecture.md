# Ledger — Architecture

## Overview

A personal finance tracker that ingests receipts via Telegram, extracts data with Claude Vision, and stores everything in Supabase. A Next.js PWA provides the review/confirmation UI.

## Stack

| Layer | Technology |
|---|---|
| Frontend / API | Next.js 15 (App Router), Vercel |
| Database | Supabase (Postgres + RLS) |
| Storage | Supabase Storage (`receipts` bucket) |
| AI / OCR | Anthropic Claude claude-sonnet-4-20250514 (vision) |
| Ingestion | Telegram Bot API → webhook |

## Data flow

```
User sends photo/PDF to Telegram bot
  → Telegram POSTs to /api/telegram/webhook (Vercel)
  → Webhook verifies secret token
  → Downloads file from Telegram CDN
  → Uploads image to Supabase Storage (receipts bucket)
  → Sends image to Claude Vision → extracts merchant, amount, date, category
  → Inserts row into expenses table (status: pending_review)
  → Replies to user in Telegram with summary
```

## Supabase project

- **Project ref:** `evdbqegscpeaabzzcwvw`
- **Region:** us-east-1 (North Virginia)
- **Org:** kevinchisholmja's Org (`jjgrbkasatxvifphphwo`)
- **Dashboard:** https://supabase.com/dashboard/project/evdbqegscpeaabzzcwvw

## Vercel project

- **Project:** kevinchisholmjas-projects/ledger
- **Production URL:** https://ledger-gules-seven.vercel.app
- **Webhook endpoint:** https://ledger-gules-seven.vercel.app/api/telegram/webhook

## Branch strategy

| Branch | Purpose | Vercel environment |
|---|---|---|
| `main` | Production — stable, shipped code | Production |
| `develop` | Active development | Preview (auto URL per push) |

## Directory structure

```
app/
  api/
    telegram/
      webhook/
        route.ts        ← Telegram webhook handler
  layout.tsx
  page.tsx
docs/
  architecture.md       ← this file
  env-vars.md           ← environment variable reference
  runbook.md            ← how to operate / troubleshoot
scripts/
  set-telegram-webhook.ts  ← one-time webhook registration
supabase/
  migrations/
    20240001_ledger_phase1.sql        ← core schema
    20240002_ledger_bank_entries_type.sql
    20240003_add_confirmed_category.sql
    20240004_amount_nullable.sql      ← allow null amount for pending entries
types/
  telegram.ts           ← Telegram API type definitions
```
