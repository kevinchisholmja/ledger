"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const PRIMARY = [
  { href: "/",             icon: "⊞", label: "Home" },
  { href: "/review",       icon: "✓", label: "Review" },
  { href: "/transactions", icon: "≡", label: "Txns" },
  { href: "/plan",         icon: "◫", label: "Plan" },
];

const MORE_ITEMS = [
  { href: "/goals",       icon: "◇", label: "Goals" },
  { href: "/accounts",    icon: "⬡", label: "All Accounts" },
  { href: "/budgets",     icon: "◎", label: "Budgets" },
  { href: "/categories",  icon: "◈", label: "Categories" },
];

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetch("/api/review/count")
      .then((r) => r.ok ? r.json() : { count: 0 })
      .then((d) => setPendingCount(d.count ?? 0))
      .catch(() => {});
  }, [pathname]);

  // Close drawer on navigation
  useEffect(() => { setShowMore(false); }, [pathname]);

  async function signOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push("/login");
  }

  const isMoreActive = MORE_ITEMS.some((i) => pathname.startsWith(i.href));

  return (
    <>
      {/* Backdrop */}
      {showMore && (
        <div
          className="fixed inset-0 bg-black/40 md:hidden"
          style={{ zIndex: 48 }}
          onClick={() => setShowMore(false)}
        />
      )}

      {/* Slide-up drawer — sits directly above the tab bar */}
      <div
        className="fixed inset-x-0 md:hidden transition-transform duration-300 ease-out"
        style={{
          zIndex: 49,
          bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))",
          transform: showMore ? "translateY(0)" : "translateY(110%)",
          pointerEvents: showMore ? "auto" : "none",
        }}
      >
        <div className="mx-3 mb-2 rounded-2xl bg-white border border-gray-200 shadow-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">More</p>
          </div>
          <nav>
            {MORE_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-5 py-3.5 text-sm transition-colors ${
                  pathname.startsWith(item.href)
                    ? "text-blue-600 font-medium bg-blue-50"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="text-xl w-6 text-center shrink-0">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-gray-100 px-5 py-3.5">
            <button
              onClick={signOut}
              className="flex items-center gap-4 w-full text-sm text-red-500 hover:text-red-600 transition-colors"
            >
              <span className="text-xl w-6 text-center shrink-0">↪</span>
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom tab bar ─────────────────────────────────────────────────── */}
      {/*
        Structure: outer nav carries the safe-area bottom padding (for iOS home
        indicator / Android gesture bar). Inner div has a fixed h-14 so the
        tabs always have the same clickable height regardless of device.
      */}
      <nav
        className="fixed inset-x-0 bottom-0 md:hidden bg-white border-t border-gray-200"
        style={{ zIndex: 50, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex h-14">
          {PRIMARY.map((item) => {
            const active = pathname === item.href;
            const hasBadge = item.href === "/review" && pendingCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                  active ? "text-blue-600" : "text-gray-400"
                }`}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                <span>{item.label}</span>
                {hasBadge && (
                  <span className="absolute top-2 right-[calc(50%-14px)] w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setShowMore((v) => !v)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
              isMoreActive || showMore ? "text-blue-600" : "text-gray-400"
            }`}
          >
            <span className="text-xl leading-none">☰</span>
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
