"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { LogOut, Menu } from "lucide-react";
import { NAV_ITEMS, MOBILE_PRIMARY } from "./nav-items";
import ThemeToggle from "./ThemeToggle";

const PRIMARY = NAV_ITEMS.filter((i) => MOBILE_PRIMARY.includes(i.href));
const MORE_ITEMS = NAV_ITEMS.filter((i) => !MOBILE_PRIMARY.includes(i.href));

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetch("/api/review/count")
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((d) => setPendingCount(d.count ?? 0))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    setShowMore(false);
  }, [pathname]);

  if (pathname === "/login") return null;

  async function signOut() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      router.push("/login");
      return;
    }
    const supabase = createBrowserClient(url, anonKey);
    await supabase.auth.signOut();
    router.push("/login");
  }

  const isMoreActive = MORE_ITEMS.some((i) => isActive(pathname, i.href));

  return (
    <>
      {/* Backdrop */}
      {showMore && (
        <div
          className="fixed inset-0 bg-foreground/40 md:hidden"
          style={{ zIndex: 48 }}
          onClick={() => setShowMore(false)}
        />
      )}

      {/* Slide-up drawer — sits directly above the tab bar */}
      <div
        className="fixed inset-x-0 transition-transform duration-300 ease-out md:hidden"
        style={{
          zIndex: 49,
          bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))",
          transform: showMore ? "translateY(0)" : "translateY(110%)",
          pointerEvents: showMore ? "auto" : "none",
        }}
      >
        <div className="mx-3 mb-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">More</p>
            <ThemeToggle />
          </div>
          <nav>
            {MORE_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-4 px-5 py-3.5 text-sm transition-colors ${
                    active
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-popover-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="size-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border px-5 py-3.5">
            <button
              onClick={signOut}
              className="flex w-full items-center gap-4 text-sm text-destructive transition-colors hover:opacity-80"
            >
              <LogOut className="size-5 shrink-0" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 backdrop-blur-sm md:hidden"
        style={{ zIndex: 50, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex h-14">
          {PRIMARY.map((item) => {
            const active = isActive(pathname, item.href);
            const hasBadge = item.href === "/review" && pendingCount > 0;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-5" />
                <span>{item.shortLabel ?? item.label}</span>
                {hasBadge && (
                  <span className="absolute right-[calc(50%-16px)] top-2 size-2 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}

          <button
            onClick={() => setShowMore((v) => !v)}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
              isMoreActive || showMore ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Menu className="size-5" />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
