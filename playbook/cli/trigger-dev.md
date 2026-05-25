# Trigger.dev

Background jobs and scheduled tasks that run outside your main server.

Install SDK: `npm install @trigger.dev/sdk`  
Install CLI: `npm install -D @trigger.dev/cli`

---

## Setup

```bash
npx trigger.dev@latest init       # initialise Trigger.dev in the project
```

This creates `trigger.config.ts` and a `src/trigger/` directory.

---

## Local development

```bash
npx trigger.dev@latest dev        # start the local dev runner
```

This opens a tunnel to Trigger.dev's cloud so jobs can be triggered remotely
while running locally. The terminal will show a URL to monitor runs.

Your `.env.local` needs:
```
TRIGGER_SECRET_KEY=tr_dev_xxxxxxxxx   # from trigger.dev dashboard → API keys
```

---

## Deploy

```bash
npx trigger.dev@latest deploy     # deploy tasks to Trigger.dev cloud
```

---

## Pulling logs

> **The Dashboard always shows the full error — that's where you should go first for a `[cause]:` or stack trace.**

**Via CLI:**
```bash
npx trigger.dev@latest logs       # stream logs from recent runs
```

**Via Dashboard (trigger.dev):**
Dashboard → your project → **Runs** tab  
Click any run to see: timeline, logs, input payload, output, errors, retries.

Each run shows:
- Which task executed
- Input and output payload
- Console output line by line
- Exact error + stack trace if it failed
- Retry history

**In your code — structured logging:**
```typescript
import { logger, task } from "@trigger.dev/sdk/v3";

export const myTask = task({
  id: "my-task",
  run: async (payload) => {
    logger.info("Starting", { payload });   // appears in Dashboard run logs
    logger.error("Something failed", { reason: "..." });
  },
});
```

---

## Defining tasks

```typescript
// src/trigger/my-task.ts
import { task, schedules } from "@trigger.dev/sdk/v3";

// One-off task (triggered from your app)
export const processReceiptTask = task({
  id: "process-receipt",
  retry: { maxAttempts: 3 },
  run: async (payload: { receiptUrl: string; userId: string }) => {
    // your logic here
    return { success: true };
  },
});

// Scheduled task (cron)
export const dailySummaryTask = schedules.task({
  id: "daily-summary",
  cron: "0 9 * * *",   // 9am every day
  run: async () => {
    // your logic here
  },
});
```

---

## Triggering from your app

```typescript
import { processReceiptTask } from "@/trigger/process-receipt";

// Fire and forget
await processReceiptTask.trigger({ receiptUrl, userId });

// Wait for result
const result = await processReceiptTask.triggerAndWait({ receiptUrl, userId });

// Batch
await processReceiptTask.batchTrigger([
  { payload: { receiptUrl: url1, userId } },
  { payload: { receiptUrl: url2, userId } },
]);
```

---

## Common patterns

**Task not appearing in Dashboard:**
Check `npx trigger.dev@latest dev` is running, and the `TRIGGER_SECRET_KEY` matches
the environment (dev key for local, prod key for deployed).

**Task failing silently:**
Add `logger.info()` calls at key points — they appear in the Dashboard run timeline.
Wrap the run body in try/catch and `logger.error()` the caught error.

**Rate limits / retries:**
```typescript
export const myTask = task({
  id: "my-task",
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    factor: 2,           // exponential backoff
  },
  run: async (payload) => { ... },
});
```
