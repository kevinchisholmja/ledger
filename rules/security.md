# Security Rules

## Authentication (non-negotiable)
Every server-side route handler and server component that touches user data MUST call
`requireUser()` at the very first line — before any logic, query, or computation.
`requireUser()` throws and redirects if the session is invalid.

```typescript
// Correct
export async function GET() {
  const user = await requireUser();
  // ... queries using user.id
}

// WRONG — data exposed before auth check
export async function GET() {
  const data = await db.select()...; // ← never do this
  const user = await requireUser();
}
```

## Row-level security (non-negotiable)
Every Drizzle query that reads or writes user data MUST include an explicit
`WHERE user_id = [authenticated user id]`. Supabase RLS is bypassed by the
service role key used by the Drizzle client — it provides zero protection here.

```typescript
// Correct
db.select().from(expenses).where(eq(expenses.user_id, user.id))

// WRONG — returns all users' data
db.select().from(expenses)
```

## Supabase client usage
- **Drizzle** (via `lib/db/client.ts`) → all database queries
- **Supabase JS** → auth sessions and storage uploads ONLY
- Never use the anon Supabase client for server-side DB queries
- Never use `createServiceRoleClient()` in client components

## Input validation
Validate all user-supplied input at API route boundaries. For PATCH routes, maintain
an explicit `allowed` fields whitelist — never spread `req.json()` directly into
a DB update.

```typescript
// Correct
const allowed = ["name", "amount", "currency"] as const;
const patch: Record<string, unknown> = {};
for (const key of allowed) {
  if (key in body) patch[key] = body[key];
}

// WRONG — user can overwrite any column including user_id
await db.update(table).set(await req.json())
```

## Secrets
- Never hard-code secrets, API keys, or credentials in source code
- All secrets live in `.env.local` (local) and Vercel environment variables (production)
- Never log secrets, tokens, or full request bodies containing auth headers
- `SUPABASE_SERVICE_ROLE_KEY` must never appear in client-side code or be sent to the browser

## SQL injection
Not a concern with Drizzle's parameterized query builder — do not interpolate user
input into raw SQL strings. If raw SQL is needed (e.g., inside `sql` tagged template),
use Drizzle's `sql` helper with parameters:

```typescript
// Correct
sql`status IN (${status1}, ${status2})`

// WRONG
sql`status = '${userInput}'`
```
