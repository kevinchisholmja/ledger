import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { seedPresetsIfEmpty } from "@/lib/seed";
import { db } from "@/lib/db/client";
import { buckets, categories, transactions } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import LogoutButton from "@/app/components/LogoutButton";
import BudgetsClient from "./BudgetsClient";

function SidebarItem({
  href, icon, label, active, badge,
}: {
  href: string; icon: string; label: string; active?: boolean; badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-white/15 text-white font-medium" : "text-slate-400 hover:text-white hover:bg-white/10"
      }`}
    >
      <span className="w-4 text-center shrink-0 text-base leading-none">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge != null && (
        <span className="ml-auto min-w-[1.25rem] h-5 rounded-full bg-blue-500 text-white text-xs font-semibold flex items-center justify-center px-1.5">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const user = await requireUser();
  await seedPresetsIfEmpty(user.id);
  const { category } = await searchParams;

  const [allBuckets, allCategories, pendingCount] = await Promise.all([
    db.select().from(buckets).where(eq(buckets.user_id, user.id)).orderBy(buckets.name),
    db.select().from(categories).where(eq(categories.user_id, user.id)).orderBy(categories.name),
    db.select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(and(eq(transactions.user_id, user.id), sql`status IN ('pending_review', 'pending_ocr')`))
      .then((r) => r[0]?.count ?? 0),
  ]);

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">

      {/* Sidebar */}
      <aside className="hidden md:flex w-56 flex-col fixed inset-y-0 left-0 bg-[#1B1F3B] z-20">
        <div className="px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="font-semibold text-white tracking-tight">Ledger</span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          <SidebarItem href="/" icon="⊞" label="Dashboard" />
          <SidebarItem href="/plan" icon="◫" label="Plan" />
          <SidebarItem href="/goals" icon="◇" label="Goals" />
          <SidebarItem href="/review" icon="✓" label="Review" badge={pendingCount > 0 ? pendingCount : undefined} />
          <SidebarItem href="/transactions" icon="≡" label="Transactions" />
          <SidebarItem href="/register" icon="▦" label="Register" />
          <SidebarItem href="/accounts" icon="⬡" label="All Accounts" />
          <SidebarItem href="/budgets" icon="◎" label="Budgets" active />
          <SidebarItem href="/categories" icon="◈" label="Categories" />
        </nav>
        <div className="px-3 pb-5 pt-3 border-t border-white/10 space-y-2">
          <p className="px-3 text-xs text-slate-500 truncate">{user.email}</p>
          <div className="px-3"><LogoutButton /></div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 md:pl-56">

        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-700 transition-colors text-lg">‹</Link>
          <h1 className="text-base font-semibold text-gray-900">Budgets</h1>
        </header>

        {/* Desktop header */}
        <div className="hidden md:block sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-3">
          <h1 className="text-base font-semibold text-gray-900">Budgets</h1>
        </div>

        <main className="px-4 md:px-8 py-6 pb-24">
          <BudgetsClient budgets={allBuckets} categories={allCategories} defaultCategoryId={category} />
        </main>
      </div>
    </div>
  );
}
