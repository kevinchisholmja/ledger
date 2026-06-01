"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { LogOut } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import ThemeToggle from "./ThemeToggle";

const HIDDEN_ROUTES = ["/login"];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Sidebar() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/review/count")
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((d) => setPendingCount(d.count ?? 0))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      console.log("[v0] Supabase env vars not configured - skipping auth check");
      return;
    }
    const supabase = createBrowserClient(url, anonKey);
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  if (HIDDEN_ROUTES.includes(pathname)) return null;

  async function signOut() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      window.location.href = "/login";
      return;
    }
    const supabase = createBrowserClient(url, anonKey);
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <span className="text-sm font-bold text-primary-foreground">L</span>
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">Ledger</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          const showBadge = item.href === "/review" && pendingCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              }`}
            >
              <Icon className="size-[18px] shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {showBadge && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-sidebar-border px-3 py-4">
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="truncate text-xs text-muted-foreground">{email ?? ""}</p>
          <ThemeToggle />
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        >
          <LogOut className="size-[18px] shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
