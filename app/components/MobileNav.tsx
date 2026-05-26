"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const PRIMARY = [
  { href: "/",            icon: "⊞", label: "Home" },
  { href: "/review",      icon: "✓", label: "Review" },
  { href: "/transactions",icon: "≡", label: "Transactions" },
  { href: "/plan",        icon: "◫", label: "Plan" },
];

const MORE_ITEMS = [
  { href: "/goals",       icon: "◇", label: "Goals" },
  { href: "/accounts",    icon: "⬡", label: "All Accounts" },
  { href: "/budgets",     icon: "◎", label: "Budgets" },
  { href: "/categories",  icon: "◈", label: "Categories" },
];

function NavTab({
  href, icon, label, active, badge,
  onClick,
}: {
  href?: string; icon: string; label: string; active?: boolean;
  badge?: boolean; onClick?: () => void;
}) {
  const cls = `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative text-xs transition-colors ${
    active ? "text-blue-600" : "text-gray-400 hover:text-gray-700"
  }`;

  const inner = (
    <>
      <span className="text-xl leading-none">{icon}</span>
      <span>{label}</span>
      {badge && (
        <span className="absolute top-1.5 left-1/2 translate-x-1 w-2 h-2 bg-blue-500 rounded-full" />
      )}
    </>
  );

  if (onClick) return <button className={cls} onClick={onClick}>{inner}</button>;
  return <Link href={href!} className={cls}>{inner}</Link>;
}

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

  async function signOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push("/login");
  }

  const isMoreActive = MORE_ITEMS.some((i) => pathname === i.href);

  return (
    <>
      {/* Backdrop */}
      {showMore && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* Slide-up drawer */}
      <div
        className={`fixed inset-x-0 bottom-16 z-50 md:hidden transition-transform duration-300 ease-out ${
          showMore ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-3 mb-2 rounded-2xl bg-white border border-gray-200 shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">More</p>
          </div>
          <nav className="py-1">
            {MORE_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMore(false)}
                className={`flex items-center gap-4 px-5 py-3.5 text-sm transition-colors ${
                  pathname === item.href
                    ? "text-blue-600 font-medium bg-blue-50"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="text-lg w-6 text-center shrink-0">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-gray-100 px-5 py-3.5">
            <button
              onClick={signOut}
              className="flex items-center gap-4 w-full text-sm text-red-500 hover:text-red-600 transition-colors"
            >
              <span className="text-lg w-6 text-center shrink-0">→</span>
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 flex md:hidden bg-white border-t border-gray-200 safe-area-inset-bottom">
        {PRIMARY.map((item) => (
          <NavTab
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={pathname === item.href}
            badge={item.href === "/review" && pendingCount > 0}
          />
        ))}
        <NavTab
          icon="☰"
          label="More"
          active={isMoreActive || showMore}
          onClick={() => setShowMore((v) => !v)}
        />
      </nav>
    </>
  );
}
