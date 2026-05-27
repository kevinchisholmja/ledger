# Database Rules

## The one rule that cannot be broken
Every Drizzle query that touches user data MUST have:
```typescript
.where(eq(table.user_id, user.id))
```
The service role key bypasses Supabase RLS completely. There is no safety net.

## Client split
| Operation | Use |
|-----------|-----|
| All DB queries | `db` from `lib/db/client.ts` (Drizzle) |
| Auth session (server) | `createServerClient()` from `@supabase/ssr` |
| Storage uploads | Supabase JS storage client |
| Auth session (client) | `createBrowserClient()` from `@supabase/ssr` |

Never mix these. Never use `supabase.from(...)` for data queries.

## Connection config
```typescript
// lib/db/client.ts
postgres(DATABASE_URL, { prepare: false })  // prepare: false required for port 6543
```
Port: **6543** (transaction-mode pooler). Direct port 5432 may be blocked on some networks.

## Drizzle patterns
```typescript
// Select with join
db.select({ id: table.id, name: other.name })
  .from(table)
  .leftJoin(other, eq(table.other_id, other.id))
  .where(eq(table.user_id, user.id))
  .orderBy(asc(table.name))

// Insert returning
const [row] = await db.insert(table).values({ user_id, ... }).returning();

// Update returning
const [row] = await db.update(table)
  .set({ ...patch, updated_at: new Date() })
  .where(and(eq(table.id, id), eq(table.user_id, user.id)))
  .returning();

// Delete returning
const [row] = await db.delete(table)
  .where(and(eq(table.id, id), eq(table.user_id, user.id)))
  .returning({ id: table.id });
```

## Schema conventions
- All types inferred from schema: `typeof table.$inferSelect`
- Do not duplicate type definitions — add them at the bottom of `lib/db/schema.ts`
- UUID primary keys: `.primaryKey().defaultRandom()`
- All user-owned tables have: `user_id: uuid("user_id").notNull()`
- Timestamps: `timestamp("x", { withTimezone: true }).defaultNow()`
- Nullable columns: do NOT use `.notNull()` — `expenses.amount` is the canonical example

## Migration rules
- File naming: `supabase/migrations/2024NNNN_short_description.sql`
- Always use `IF NOT EXISTS` for `ADD COLUMN` statements
- Always use `IF NOT EXISTS` for `CREATE TABLE` statements
- Never modify a migration that has already been applied to production
- Migrations are applied via Supabase Dashboard SQL Editor (not `supabase db push`)
- Test every migration on a duplicate of the live DB before production

## Phase A transition (current state)
The DB is in active transition. Two generations of the transaction model coexist:

| Table | Phase | Status |
|-------|-------|--------|
| `expenses` | v1 (current) | Debit-only; all app code reads this table |
| `transactions` | v2 (Phase A3+) | Not yet created |
| `bank_entries` | v1 | Being replaced by transactions with source='csv' |
| `buckets` | v1+v2 | Keep — budget envelopes |
| `categories` | v1 (needs type column) | Phase A1 adds type='expense'|'income' |
| `bank_accounts` | v1+v2 | Keep — extended in migration 20240012 |
| `payees` | v2 (Phase A1) | Not yet created |
| `budget_assignments` | v2 (Phase A1) | Not yet created |

**Do not** write new application features against `expenses` — they'll need to be
rewritten in Phase A4. Write against `transactions` once Phase A1 is complete.
