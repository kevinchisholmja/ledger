import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { expenses, buckets, bankAccounts } from "@/lib/db/schema";
import { eq, and, ne, isNotNull, desc, sql } from "drizzle-orm";
import LogoutButton from "@/app/components/LogoutButton";
import { formatCurrency } from "@/lib/format";
import AccountsClient from "./AccountsClient";

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

const STATUS_LABELS: Record<string, string> = {
  pending_ocr: "OCR pending",
  pending_review: "Needs review",
  confirmed: "Confirmed",
  reconciled: "Reconciled",
};

const STATUS_COLORS: Record<string, string> = {
  pending_ocr: "bg-amber-50 border border-amber-200 text-amber-600",
  pending_review: "bg-blue-50 border border-blue-200 text-blue-600",
  confirmed: "bg-emerald-50 border border-emerald-200 text-emerald-600",
  reconciled: "bg-gray-100 text-gray-500",
};

export default async function AccountsPage() {
  const user = await requireUser();

  const [allExpenses, allBankAccounts, pendingCount, totalSpent, userBuckets] = await Promise.all([
    db.select({
      id: expenses.id,
      merchant: expenses.merchant,
      amount: expenses.amount,
      currency: expenses.currency,
      date: expenses.date,
      status: expenses.status,
      source: expenses.source,
      bucket_id: expenses.bucket_id,
      confirmed_category: expenses.confirmed_category,
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
  ]);

  const bucketMap = new Map(userBuckets.map((b) => [b.id, b.name]));

  // Group transactions by date
  const byDate = new Map<string, typeof allExpenses>();
  for (const e of allExpenses) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date)!.push(e);
  }
  const dateGroups = [...byDate.entries()];

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
          <SidebarItem href="/review" icon="✓" label="Review" badge={pendingCount > 0 ? pendingCount : undefined} />
          <SidebarItem href="/transactions" icon="≡" label="Transactions" />
          <SidebarItem href="/accounts" icon="⬡" label="All Accounts" active />
          <SidebarItem href="/budgets" icon="◎" label="Budgets" />
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

              {/* Column headers — desktop */}
              <div
                className="hidden md:grid border-b border-gray-200 bg-gray-50 rounded-t-2xl px-4 py-2"
                style={{ gridTemplateColumns: "90px 1fr 140px 100px 120px 110px" }}
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Date</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Payee</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Budget</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Label</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Source</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">Outflow</span>
              </div>

              {allExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl bg-white border border-gray-200">
                  <p className="text-gray-500 font-medium">No transactions yet</p>
                  <p className="text-gray-400 text-sm mt-1.5">
                    Send a receipt to your Telegram bot to get started
                  </p>
                </div>
              ) : (
                <div className="rounded-b-2xl md:rounded-t-none rounded-2xl bg-white border border-gray-200 overflow-hidden divide-y divide-gray-100">
                  {dateGroups.map(([date, items]) => (
                    <div key={date}>
                      {/* Date subheader */}
                      <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                        <span className="text-xs font-semibold text-gray-400">
                          {new Date(date + "T12:00:00").toLocaleDateString("en-JM", {
                            weekday: "short", month: "short", day: "numeric", year: "numeric",
                          })}
                        </span>
                      </div>

                      {items.map((e) => {
                        const budgetName = e.bucket_id ? bucketMap.get(e.bucket_id) : null;
                        const hasAmount = e.amount != null && e.status !== "pending_ocr";

                        return (
                          <Link
                            key={e.id}
                            href="/review"
                            className="flex md:grid items-center gap-3 md:gap-0 px-4 py-3 hover:bg-gray-50 transition-colors"
                            style={{ gridTemplateColumns: "90px 1fr 140px 100px 120px 110px" }}
                          >
                            {/* Mobile layout */}
                            <div className="md:hidden flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {e.merchant ?? "—"}
                                </p>
                                <p className={`text-sm font-semibold tabular-nums shrink-0 ${hasAmount ? "text-gray-900" : "text-gray-400"}`}>
                                  {hasAmount ? formatCurrency(Number(e.amount), e.currency) : "pending"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[e.status] ?? "bg-gray-100 text-gray-500"}`}>
                                  {STATUS_LABELS[e.status] ?? e.status}
                                </span>
                                {budgetName && (
                                  <span className="text-xs text-gray-400 truncate">{budgetName}</span>
                                )}
                              </div>
                            </div>

                            {/* Desktop layout */}
                            <span className="hidden md:block text-sm text-gray-400 tabular-nums">{date}</span>
                            <span className="hidden md:block text-sm font-medium text-gray-900 truncate pr-4">
                              {e.merchant ?? <span className="text-gray-400 italic">No merchant</span>}
                            </span>
                            <span className="hidden md:block text-sm text-gray-500 truncate pr-2">
                              {budgetName ?? <span className="text-gray-300">—</span>}
                            </span>
                            <span className="hidden md:block text-sm text-gray-500 truncate pr-2">
                              {e.confirmed_category ?? <span className="text-gray-300">—</span>}
                            </span>
                            <span className="hidden md:flex items-center">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[e.status] ?? "bg-gray-100 text-gray-500"}`}>
                                {STATUS_LABELS[e.status] ?? e.status}
                              </span>
                            </span>
                            <span className={`hidden md:block text-sm font-semibold tabular-nums text-right ${hasAmount ? "text-gray-900" : "text-gray-400"}`}>
                              {hasAmount ? formatCurrency(Number(e.amount), e.currency) : "—"}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
