# Clerk (Auth)

Clerk is a hosted auth provider. There is no CLI — everything is SDK and Dashboard.

Install: `npm install @clerk/nextjs`

---

## Setup (Next.js App Router)

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
```

```typescript
// app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html><body>{children}</body></html>
    </ClerkProvider>
  );
}
```

---

## Getting the current user

```typescript
// Server Component / Route Handler
import { auth, currentUser } from "@clerk/nextjs/server";

const { userId } = await auth();         // just the ID (fast)
const user = await currentUser();        // full user object (slower)

if (!userId) redirect("/sign-in");
```

```typescript
// Client Component
import { useUser, useAuth } from "@clerk/nextjs";

const { user, isLoaded } = useUser();
const { userId, isSignedIn } = useAuth();
```

---

## Pre-built UI components

```typescript
import { SignIn, SignUp, UserButton, SignedIn, SignedOut } from "@clerk/nextjs";

// Drop-in sign-in page
<SignIn />

// Show/hide based on auth state
<SignedIn><UserButton /></SignedIn>
<SignedOut><a href="/sign-in">Sign in</a></SignedOut>
```

---

## Environment variables

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

---

## Pulling logs

> **The Dashboard always shows the full error — that's where you should go first for a `[cause]:` or stack trace.**

No CLI. Use the **Clerk Dashboard** (dashboard.clerk.com):

- **Users** → click any user → view their sessions, sign-in history, metadata
- **Logs** (left sidebar) → all auth events in real time: sign-ins, sign-ups, errors,
  webhook deliveries, failed attempts
- **Webhooks** → delivery logs for each webhook event

Common errors in Logs:
- `session_token_invalid` — expired or tampered session
- `user_not_found` — user deleted but token still used
- `rate_limit_exceeded` — too many requests from one IP

**From your app — logging auth errors:**
```typescript
import { auth } from "@clerk/nextjs/server";

const { userId } = await auth();
// If this returns null, the session is invalid — redirect, don't log
// Clerk handles the error details on their end
```

For webhook verification errors, log the raw body and signature header:
```typescript
import { Webhook } from "svix";
try {
  const event = wh.verify(body, headers);
} catch (e) {
  console.error("Webhook verification failed:", e.message);
}
```

---

## Common patterns

**"Unauthenticated" in a Server Component:**
Call `await auth()` not `auth()` — it's async in newer Clerk versions.

**User ID vs Database ID:**
Clerk's `userId` is a string like `user_2abc...`. Store it as `TEXT` in your database,
not UUID. Map it to your internal user record on first sign-in.

**Protecting API routes:**
```typescript
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  // ...
}
```
