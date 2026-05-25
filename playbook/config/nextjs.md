# Next.js — Config Reference

This document covers Next.js App Router (v13+). Pay attention to version — APIs
changed significantly between v13, v14, v15, and v16.

**Check the installed version before writing any code:**
```bash
cat node_modules/next/package.json | grep '"version"'
```

---

## next.config.ts (or next.config.js)

```typescript
import type { NextConfig } from "next";

const config: NextConfig = {
  // Images — add any external domains you load images from
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "your-bucket.supabase.co",
      },
    ],
  },

  // Environment variables available to the browser at BUILD TIME
  // Prefer NEXT_PUBLIC_ prefix instead — it's automatic
  env: {
    CUSTOM_VAR: process.env.CUSTOM_VAR,
  },

  // Redirect rules
  async redirects() {
    return [
      { source: "/old", destination: "/new", permanent: true },
    ];
  },

  // Rewrite rules (proxy without redirecting the browser)
  async rewrites() {
    return [
      { source: "/api/proxy/:path*", destination: "https://api.example.com/:path*" },
    ];
  },

  // Headers
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};

export default config;
```

---

## App Router — file conventions

| File | Purpose |
|---|---|
| `app/layout.tsx` | Root layout — wraps everything |
| `app/page.tsx` | `/` route |
| `app/[slug]/page.tsx` | Dynamic route |
| `app/api/route/route.ts` | API route handler |
| `app/error.tsx` | Error boundary for the route |
| `app/loading.tsx` | Suspense loading UI |
| `app/not-found.tsx` | 404 page |
| `middleware.ts` (v14) / `proxy.ts` (v16) | Edge middleware |
| `app/manifest.ts` | PWA web app manifest |

**Dynamic routes:**
- `[id]` — single segment
- `[...slug]` — catch-all
- `[[...slug]]` — optional catch-all

---

## Server vs Client Components

```typescript
// Server Component (default — no directive needed)
// Can: fetch data, access env vars, use async/await
// Cannot: use hooks, add event listeners, access browser APIs
export default async function Page() {
  const data = await fetch("...");
  return <div>{data}</div>;
}

// Client Component — add "use client" at the top
"use client";
import { useState } from "react";
export default function Counter() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}
```

**Rule:** Keep Server Components as far down the tree as possible.
Put `"use client"` only on components that actually need interactivity.

---

## API Route handlers

```typescript
// app/api/expenses/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  return NextResponse.json({ id });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  return NextResponse.json({ created: true }, { status: 201 });
}

// Dynamic route: app/api/expenses/[id]/route.ts
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;   // params is a Promise in Next.js 15+
  return NextResponse.json({ id });
}
```

---

## Environment variables

| Prefix | Available in | When resolved |
|---|---|---|
| `NEXT_PUBLIC_` | Browser + Server | Build time |
| (no prefix) | Server only | Runtime |

`NEXT_PUBLIC_*` vars are baked into the JavaScript bundle at build time.
**Changing them in Vercel requires a redeployment.**

---

## Navigation

```typescript
// Link component (client-side navigation)
import Link from "next/link";
<Link href="/expenses">Expenses</Link>

// Programmatic navigation (Client Component only)
"use client";
import { useRouter } from "next/navigation";
const router = useRouter();
router.push("/expenses");
router.refresh();           // re-fetch server component data

// Redirect (Server Component / Route Handler)
import { redirect } from "next/navigation";
redirect("/login");
```

---

## Image component

```typescript
import Image from "next/image";
<Image src="/icon.png" alt="Icon" width={192} height={192} priority />
// priority — add for above-the-fold images (skips lazy loading)
```

---

## Metadata

```typescript
// app/layout.tsx or any page
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "App Name",
  description: "Description",
  manifest: "/manifest.webmanifest",    // PWA
  appleWebApp: { capable: true },       // iOS home screen
};
```

---

## Common gotchas

**`params` is a Promise in Next.js 15+:**
```typescript
// Wrong (Next.js 14 style):
export async function GET({ params }: { params: { id: string } }) {
// Right (Next.js 15+):
export async function GET({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
```

**Cookies in Server Components:**
```typescript
import { cookies } from "next/headers";
const cookieStore = await cookies();   // async in Next.js 15+
```

**`middleware.ts` renamed to `proxy.ts` in Next.js 16.**
Export must be named `proxy`, not `middleware`.
