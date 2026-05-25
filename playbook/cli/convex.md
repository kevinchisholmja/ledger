# Convex

Convex is a reactive backend-as-a-service: database, server functions, and real-time
subscriptions in one. No separate API layer needed for most apps.

Install: `npm install convex`  
Authenticate: `npx convex login`

---

## Setup

```bash
npx convex dev                    # start local dev mode (syncs functions, opens dashboard)
npx convex init                   # initialise Convex in an existing project
```

This creates a `convex/` directory and a `.env.local` entry:
```
NEXT_PUBLIC_CONVEX_URL=https://your-instance.convex.cloud
```

---

## Local development

```bash
npx convex dev                    # run dev server (watches convex/ for changes)
```

Keep this running while developing. It:
- Syncs your `convex/` functions to the cloud instantly on save
- Shows function logs in the terminal
- Opens the Convex Dashboard for this project

---

## Deploy

```bash
npx convex deploy                 # deploy to production
```

Set `CONVEX_DEPLOY_KEY` in your Vercel/CI environment for automated deploys.

---

## Defining functions

```typescript
// convex/expenses.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Query — read data (automatically reactive)
export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("expenses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

// Mutation — write data
export const create = mutation({
  args: { userId: v.string(), amount: v.number(), merchant: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("expenses", args);
  },
});
```

---

## Calling from your app

```typescript
// Client Component — reactive (re-renders when data changes)
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const expenses = useQuery(api.expenses.list, { userId });
const createExpense = useMutation(api.expenses.create);

await createExpense({ userId, amount: 100, merchant: "Café" });

// Server Component / Route Handler
import { fetchQuery, fetchMutation } from "convex/nextjs";

const expenses = await fetchQuery(api.expenses.list, { userId });
```

---

## Pulling logs

> **The Dashboard always shows the full error — that's where you should go first for a `[cause]:` or stack trace.**

**Via terminal (during `npx convex dev`):**
Function console output appears in the terminal that's running `npx convex dev`.

**Via Convex Dashboard:**
dashboard.convex.dev → your project → **Logs** tab  
Shows: function name, execution time, arguments, return value, console output, errors.

**In your functions — structured logging:**
```typescript
handler: async (ctx, args) => {
  console.log("Processing", args);          // appears in Dashboard logs
  console.error("Failed:", error.message);  // appears as error in logs
}
```

**For HTTP actions:**
```typescript
import { httpAction } from "./_generated/server";

export const webhook = httpAction(async (ctx, req) => {
  console.log("Headers:", Object.fromEntries(req.headers));
  // ...
});
```

---

## Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  expenses: defineTable({
    userId: v.string(),
    amount: v.number(),
    merchant: v.string(),
    date: v.string(),
    status: v.union(v.literal("pending"), v.literal("confirmed")),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),
});
```

---

## Common patterns

**"Could not find public function":**
Run `npx convex dev` — the generated API types are stale. Saving any file in `convex/`
regenerates `convex/_generated/`.

**Function not updating:**
Make sure `npx convex dev` is running. Functions are deployed on save, not on page refresh.

**Real-time subscriptions:**
`useQuery` is automatically reactive — no websocket setup needed. The component
re-renders whenever the underlying data changes in the database.
