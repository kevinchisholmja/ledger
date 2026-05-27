# API Route Conventions

## File locations
```
app/api/{resource}/route.ts          ← collection: GET (list), POST (create)
app/api/{resource}/[id]/route.ts     ← item: GET, PATCH, DELETE
```

## Method semantics
| Method | Action | Body | Response |
|--------|--------|------|----------|
| GET | List or retrieve | None | `200` + data array or object |
| POST | Create | JSON object | `201` + created object |
| PATCH | Partial update | Partial JSON | `200` + updated object |
| DELETE | Remove | None | `200` + `{ ok: true }` |

## Required pattern for every handler
```typescript
export async function METHOD(req: NextRequest) {
  const user = await requireUser();          // 1. Auth first, always
  const body = await req.json();             // 2. Parse input
  // 3. Validate (whitelist for PATCH)
  // 4. Query with WHERE user_id = user.id
  // 5. Return NextResponse.json(result)
}
```

## Response format
```typescript
// Success
return NextResponse.json(data);             // 200
return NextResponse.json(data, { status: 201 }); // Created

// Error
return NextResponse.json({ error: "message" }, { status: 400 });
return NextResponse.json({ error: "Not found" }, { status: 404 });
```
Never return plain strings or raw DB errors to the client.

## Route naming (current, Phase A1–A3 state)
```
GET  /api/budgets              → list buckets
POST /api/budgets              → create bucket
PATCH/DELETE /api/budgets/[id]

GET  /api/categories           → list categories
POST /api/categories           → create category
DELETE /api/categories/[id]

GET  /api/accounts             → list bank accounts
POST /api/accounts             → create account
PATCH/DELETE /api/accounts/[id]

PATCH /api/expenses/[id]       → update expense (→ /api/transactions/[id] in Phase A4)
POST /api/expenses/[id]/retry-ocr

GET  /api/review/count         → pending badge count

POST /api/upload               → web receipt upload + OCR
POST /api/shortcut/upload      → iOS Shortcut endpoint
POST /api/telegram/webhook     → Telegram bot webhook
```

## PATCH field whitelist pattern
Always use this pattern — never pass `req.json()` directly to the DB update:
```typescript
const allowed = ["name", "amount", "currency"] as const;
const patch: Record<string, unknown> = {};
for (const key of allowed) {
  if (key in body) patch[key] = body[key];
}
if (Object.keys(patch).length === 0) {
  return NextResponse.json({ error: "No valid fields" }, { status: 400 });
}
```

## Params (Next.js 16 App Router)
Route params are Promises — always await them:
```typescript
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
```
