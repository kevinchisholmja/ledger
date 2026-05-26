import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { expenses, buckets, bankAccounts, categories } from "@/lib/db/schema";
import { eq, and, ne, isNotNull, desc, sql } from "drizzle-orm";
import LogoutButton from "@/app/components/LogoutButton";
import { formatCurrency } from "@/lib/format";
import AccountsClient from "./AccountsClient";
import TransactionListClient from "@/app/components/TransactionListClient";

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


export default async function AccountsPage() {
  const user = await requireUser();

  const [allExpenses, allBankAccounts, pendingCount, totalSpent, userBuckets, userCategories] = await Promise.all([
    db.select({
      id: expenses.id,
      merchant: expenses.merchant,
      amount: expenses.amount,
      currency: expenses.currency,
      date: expenses.date,
      status: expenses.status,
      source: expenses.source,
      bucket_id: expenses.bucket_id,
      category_id: expenses.category_id,
      confirmed_category: expenses.confirmed_category,
      notes: expenses.notes,
      receipt_url: expenses.receipt_url,
    })
    .from(expenses)
    .where(eq(expenses.user_id, user.id))
    .orderBy(desc(expenses.date), desc(expenses.created_at)),

    db.select()
      .from(bankAccounts)
      .where(eq(bankAccounts.user_id, user.id))
      .orderBy(bankAccounts.name),

    db.select({ count: sql<number>`count(*)::int` })
      .from(expenses)
      .where(and(
        eq(expenses.user_id, user.id),
        sql`status IN ('pending_review', 'pending_ocr')`,
      ))
      .then((r) => r[0]?.count ?? 0),

    db.select({ total: sql<string>`COALESCE(SUM(${expenses.amount}::numeric), 0)` })
      .from(expenses)
      .where(and(
        eq(expenses.user_id, user.id),
        ne(expenses.status, "pending_ocr"),
        isNotNull(expenses.amount),
      ))
      .then((r) => Number(r[0]?.total ?? 0)),

    db.select({ id: buckets.id, name: buckets.name })
      .from(buckets)
      .where(eq(buckets.user_id, user.id)),

    db.select({ id: categories.id, name: categories.name, icon: categories.icon })
      .from(categories)
      .where(eq(categories.user_id, user.id))
      .orderBy(categories.name),
  ]);

  const confirmedCount = allExpenses.filter(
    (e) => e.status === "confirmed" || e.status === "reconciled"
  ).length;
  const pendingReview = allExpenses.filter(
    (e) => e.status === "pending_review" || e.status === "pending_ocr"
  ).length;

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
          <SidebarItem href="/accounts" icon="⬡" label="All Accounts" active />
          <SidebarItem href="/budgets" icon="◎" label="Budgets" />
          <SidebarItem href="/categories" icon="◈" label="Categories" />
        </nav>
        <div className="px-3 pb-5 pt-3 border-t border-white/10 space-y-2">
          <p className="px-3 text-xs text-slate-500 truncate">{user.email}</p>
          <div className="px-3"><LogoutButton /></div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 md:pl-56 flex min-h-screen">
        <div className="flex-1 min-w-0 flex flex-col">

          {/* Mobile header */}
          <header className="md:hidden sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm px-4 py-3 flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-700 text-lg">‹</Link>
            <h1 className="text-base font-semibold text-gray-900">All Accounts</h1>
          </header>

          {/* Desktop header */}
          <div className="hidden md:block sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-3">
            <h1 className="text-base font-semibold text-gray-900">All Accounts</h1>
          </div>

          <main className="flex-1 px-4 md:px-8 py-6 space-y-8 pb-24 md:pb-10">

            {/* ── Bank Accounts section ── */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Bank Accounts
              </h2>
              <AccountsClient accounts={allBankAccounts} />
            </section>

            {/* ── Transactions section ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Transactions
                </h2>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span><span className="font-semibold text-gray-900">{allExpenses.length}</span> total</span>
                  <span><span className="font-semibold text-emerald-600">{confirmedCount}</span> confirmed</span>
                  <span><span className="font-semibold text-blue-600">{pendingReview}</span> needs review</span>
                  <span className="font-semibold text-gray-900 tabular-nums">{formatCurrency(totalSpent, "JMD")}</span>
                </div>
              </div>

              <TransactionListClient
                transactions={allExpenses}
                budgets={userBuckets}
                categories={userCategories}
              />
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
