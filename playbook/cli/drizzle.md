# Drizzle ORM

Install: `npm install drizzle-orm postgres`  
Dev tools: `npm install -D drizzle-kit`

Config file: `drizzle.config.ts` at the project root.

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",           // generated migration output directory
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

## Schema

Define your schema in TypeScript. This is the source of truth for your types.

```typescript
// lib/db/schema.ts
import { pgTable, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const things = pgTable("things", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }), // nullable — omit .notNull()
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type Thing = typeof things.$inferSelect;
export type NewThing = typeof things.$inferInsert;
```

---

## Client

```typescript
// lib/db/client.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// prepare: false is required for Supabase transaction-mode pooler (port 6543)
const client = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(client, { schema });
```

---

## Queries

```typescript
import { db } from "@/lib/db/client";
import { things } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// Select
const rows = await db.select().from(things).where(eq(things.user_id, userId));

// Select with order and limit
const recent = await db
  .select()
  .from(things)
  .where(eq(things.user_id, userId))
  .orderBy(desc(things.created_at))
  .limit(10);

// Insert
const [created] = await db
  .insert(things)
  .values({ user_id: userId, name: "thing" })
  .returning();

// Update
await db
  .update(things)
  .set({ name: "updated", updated_at: new Date() })
  .where(and(eq(things.id, id), eq(things.user_id, userId)));

// Delete
await db
  .delete(things)
  .where(and(eq(things.id, id), eq(things.user_id, userId)));

// Count
const [{ count }] = await db
  .select({ count: sql<number>`count(*)::int` })
  .from(things)
  .where(eq(things.user_id, userId));
```

**Security rule:** Every query must include `WHERE user_id = X`.
The service role key bypasses RLS entirely. There is no database-level protection.

---

## Drizzle Kit CLI

```bash
npx drizzle-kit generate          # generate SQL migration from schema changes
npx drizzle-kit migrate           # apply pending migrations to the database
npx drizzle-kit push              # push schema directly (skip migration files — dev only)
npx drizzle-kit studio            # open visual DB browser at https://local.drizzle.studio
npx drizzle-kit check             # check for schema drift
```

**Workflow:**
1. Change `lib/db/schema.ts`
2. `npx drizzle-kit generate` → creates a SQL file in `drizzle/`
3. Review the SQL
4. `npx drizzle-kit migrate` → applies it

---

## Common patterns

**`prepare: false` error:**
Required for any Supabase pooler connection (port 6543). Missing this causes runtime
errors under any concurrency. Set it in the postgres client config and never remove it.

**Type error on `.set()`:**
Drizzle's `set()` parameter must be `Partial<NewTable>`. Cast if needed:
```typescript
const patch: Partial<NewThing> = {};
// ... build patch ...
await db.update(things).set(patch).where(...);
```

**Schema mismatch (`column does not exist`):**
The Drizzle schema has a column that doesn't exist in the real database, or vice versa.
Check the actual table in the Supabase Dashboard → Table Editor.
Write a migration to bring the database in line with the schema.
