@../../rules/api-conventions.md
@../../rules/security.md

# API Routes — Context

You are working in the API layer. Every file here is a Next.js 16 App Router
route handler.

## Mandatory pattern for every handler
```typescript
import { requireUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function METHOD(req: NextRequest) {
  const user = await requireUser();  // ← always first
  // ...
}
```

## Current route inventory
```
/api/budgets              POST (create), GET (list)
/api/budgets/[id]         PATCH, DELETE
/api/budgets/rename-group PATCH (renames all buckets in a group)
/api/categories           POST, GET, DELETE /[id]
/api/accounts             POST, GET
/api/accounts/[id]        PATCH, DELETE
/api/transactions/[id]    PATCH (edit), DELETE
/api/transactions/[id]/retry-ocr POST
/api/review/count         GET (pending badge)
/api/upload               POST (web receipt + OCR)
/api/shortcut/upload      POST (iOS Shortcut, auth: x-shortcut-secret header)
/api/telegram/webhook     POST (bot webhook, auth: x-telegram-bot-api-secret-token header)
/api/auth/callback        GET (OAuth + magic link)
```

## Special auth for non-session routes
- `shortcut/upload`: `x-shortcut-secret` header must match `SHORTCUT_SECRET` env var
- `telegram/webhook`: `x-telegram-bot-api-secret-token` must match `TELEGRAM_SECRET_TOKEN` env var
- These routes do NOT call `requireUser()` — they use their own auth headers
