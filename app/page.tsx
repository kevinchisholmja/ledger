import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { expenses } from "@/lib/db/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";
import LogoutButton from "@/app/components/LogoutButton";
import { formatCurrency } from "@/lib/format";

interface BucketSummaryRow {
  bucket_id: string;
  user_id: string;
  bucket_name: string;
  color: string | null;
  icon: string | null;
  period: string;
  amount: string;
  currency: string;
  active: boolean;
  month_spent: string;
  month_remaining: string;
  year_spent: string;
  month_expense_count: string;
}

function barColor(pct: number) {
  if (pct >= 100) return "bg-red-500";
  if (pct >= 80) return "bg-amber-400";
  return "bg-blue-500";
}

// YNAB-style available pill
function AvailablePill({ remaining, allocated }: { remaining: number; allocated: number; currency: string }) {
  const over = remaining < 0;
  const close = !over && allocated > 0 && remaining < allocated * 0.2;

  if (over) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 tabular-nums">
        −{formatCurrency(Math.abs(remaining), "JMD")}
      </span>
    );
  }
  if (close) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 tabular-nums">
        {formatCurrency(remaining, "JMD")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 tabular-nums">
      {formatCurrency(remaining, "JMD")}
    </span>
  );
}

function categoryIcon(cat: string | null | undefined): string {
  const map: Record<string, string> = {
    "Food & Drink": "🍽️", Groceries: "🛒", Transport: "🚗", Utilities: "⚡",
    Shopping: "🛍️", Health: "💊", Entertainment: "🎬", Travel: "✈️", Business: "💼",
  };
  return map[cat ?? ""] ?? "💳";
}

export default async function DashboardPage() {
  const user = await requireUser();

  const [recentExpenses, pendingCount, budgetSummaries] = await Promise.all([
    db.select().from(expenses).where(eq(expenses.user_id, user.id))
      .orderBy(desc(expenses.created_at)).limit(8),

    db.select({ count: sql<number>`count(*)::int` }).from(expenses)
      .where(and(eq(expenses.user_id, user.id), or(eq(expenses.status, "pending_review"), eq(expenses.status, "pending_ocr"))))
      .then((r) => r[0]?.count ?? 0),

    db.execute(sql`SELECT * FROM buckets_summary WHERE user_id = ${user.id} ORDER BY (month_spent::numeric / NULLIF(amount::numeric, 0)) DESC NULLS LAST`)
      .then((r) => r as unknown as BucketSummaryRow[]),
  ]);

  const firstName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    (user.user_metadata?.name as string | undefined)?.split(" ")[0] ??
    user.email?.split("@")[0] ?? "there";

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-JM", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const monthName = now.toLocaleDateString("en-JM", { month: "long" });

  const totalBudget = budgetSummaries.reduce((s, b) => s + Number(b.amount), 0);
  const totalSpent = budgetSummaries.reduce((s, b) => s + Number(b.month_spent), 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">

      {/* ── Sidebar — dark navy (YNAB-style) ──────────────────────────────── */}
      <aside className="hidden md:flex w-56 flex-col fixed inset-y-0 bg-[#1B1F3B] z-20">
        {/* Logo */}
        <div className="px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="font-semibold text-white tracking-tight">Ledger</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          <SidebarItem href="/" icon="⊞" label="Dashboard" active />
          <SidebarItem href="/review" icon="✓" label="Review" badge={pendingCount > 0 ? pendingCount : undefined} />
          <SidebarItem href="/transactions" icon="≡" label="Transactions" />
          <SidebarItem href="/budgets" icon="◎" label="Budgets" />
        </nav>

        {/* Footer */}
        <div className="px-3 pb-5 pt-3 border-t border-white/10 space-y-2">
          <p className="px-3 text-xs text-slate-500 truncate">{user.email}</p>
          <div className="px-3">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 md:pl-56 min-w-0 pb-20 md:pb-0">

        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">L</span>
            </div>
            <span className="font-semibold text-gray-900 tracking-tight">Ledger</span>
          </div>
          <Link href="/review" className="relative p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <span className="text-lg">✓</span>
            {pendingCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />}
          </Link>
        </header>

        <main className="px-4 md:px-8 lg:px-10 py-6 md:py-8 max-w-4xl">

          {/* Greeting */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-gray-900 capitalize">Hello, {firstName}</h1>
            <p className="text-gray-400 text-sm mt-0.5">{dateStr}</p>
          </div>

          {/* Pending banner */}
          {pendingCount > 0 && (
            <Link href="/review"
              className="flex items-center justify-between rounded-2xl bg-blue-50 border border-blue-200 px-5 py-4 mb-7 hover:bg-blue-100 transition-colors group">
              <div>
                <p className="font-semibold text-blue-700">
                  {pendingCount} {pendingCount === 1 ? "transaction" : "transactions"} to review
                </p>
                <p className="text-sm text-blue-500 mt-0.5">Tap to confirm and categorise</p>
              </div>
              <span className="text-blue-400 text-xl group-hover:translate-x-0.5 transition-transform">›</span>
            </Link>
          )}

          {/* Summary stats */}
          {budgetSummaries.length > 0 && (
            <div className="grid grid-cols-3 gap-3 md:gap-4 mb-7">
              <div className="rounded-2xl bg-white border border-gray-200 shadow-sm px-4 py-4">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Budget</p>
                <p className="text-lg md:text-xl font-bold text-gray-900 mt-1 tabular-nums">
                  {formatCurrency(totalBudget, "JMD")}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{monthName}</p>
              </div>
              <div className="rounded-2xl bg-white border border-gray-200 shadow-sm px-4 py-4">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Activity</p>
                <p className={`text-lg md:text-xl font-bold mt-1 tabular-nums ${overallPct >= 100 ? "text-red-500" : "text-gray-900"}`}>
                  {formatCurrency(totalSpent, "JMD")}
                </p>
                <p className={`text-xs mt-0.5 ${overallPct >= 100 ? "text-red-500" : overallPct >= 80 ? "text-amber-500" : "text-emerald-500"}`}>
                  {overallPct.toFixed(0)}% used
                </p>
              </div>
              <div className="rounded-2xl bg-white border border-gray-200 shadow-sm px-4 py-4">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Available</p>
                <p className={`text-lg md:text-xl font-bold mt-1 tabular-nums ${totalRemaining < 0 ? "text-red-500" : "text-gray-900"}`}>
                  {formatCurrency(Math.abs(totalRemaining), "JMD")}
                </p>
                <p className={`text-xs mt-0.5 ${totalRemaining < 0 ? "text-red-500" : "text-emerald-500"}`}>
                  {totalRemaining < 0 ? "over budget" : "remaining"}
                </p>
              </div>
            </div>
          )}

          {/* Budget list */}
          {budgetSummaries.length > 0 ? (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">Budgets</h2>
                <Link href="/budgets" className="text-xs text-blue-600 hover:text-blue-500 transition-colors">
                  Manage →
                </Link>
              </div>

              {/* Desktop column headers — YNAB style */}
              <div className="hidden md:grid px-4 mb-1" style={{ gridTemplateColumns: "1fr 100px 1fr 110px" }}>
                <span />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">Assigned</span>
                <span />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">Available</span>
              </div>

              <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
                {budgetSummaries.map((b) => {
                  const allocated = Number(b.amount);
                  const spent = Number(b.month_spent);
                  const remaining = Number(b.month_remaining);
                  const pct = allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;
                  const over = spent > allocated;
                  const cur = b.currency ?? "JMD";

                  return (
                    <div key={b.bucket_id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                      {/* Mobile */}
                      <div className="md:hidden">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {b.icon
                              ? <span className="text-lg shrink-0">{b.icon}</span>
                              : <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                  <span className="text-gray-500 text-xs font-bold">{b.bucket_name[0]}</span>
                                </div>
                            }
                            <span className="text-sm font-medium text-gray-900 truncate">{b.bucket_name}</span>
                          </div>
                          <AvailablePill remaining={remaining} allocated={allocated} currency={cur} />
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 mb-1.5">
                          <div className={`h-full rounded-full ${barColor(over ? 100 : pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>{formatCurrency(spent, cur)} spent</span>
                          <span>of {formatCurrency(allocated, cur)}</span>
                        </div>
                      </div>

                      {/* Desktop — YNAB: name | assigned | bar | available pill */}
                      <div className="hidden md:grid items-center gap-x-4" style={{ gridTemplateColumns: "1fr 100px 1fr 110px" }}>
                        <div className="flex items-center gap-3 min-w-0">
                          {b.icon
                            ? <span className="text-xl w-8 text-center shrink-0">{b.icon}</span>
                            : <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                <span className="text-gray-500 text-xs font-bold">{b.bucket_name[0]}</span>
                              </div>
                          }
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{b.bucket_name}</p>
                            <p className="text-xs text-gray-400 capitalize">{b.period}</p>
                          </div>
                        </div>

                        {/* Assigned */}
                        <span className="text-sm text-gray-500 tabular-nums text-right">
                          {formatCurrency(allocated, cur)}
                        </span>

                        {/* Progress bar */}
                        <div className="h-2 rounded-full bg-gray-100">
                          <div className={`h-full rounded-full ${barColor(over ? 100 : pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>

                        {/* Available pill */}
                        <div className="flex justify-end">
                          <AvailablePill remaining={remaining} allocated={allocated} currency={cur} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : (
            <div className="rounded-2xl bg-white border border-gray-200 border-dashed px-6 py-12 text-center mb-8">
              <p className="text-gray-500 font-medium">No budgets yet</p>
              <p className="text-gray-400 text-sm mt-1.5">Create a budget to start tracking your spending</p>
              <Link href="/budgets"
                className="inline-block mt-5 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-medium text-white transition-colors">
                Create budget
              </Link>
            </div>
          )}

          {/* Recent transactions */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Recent</h2>
              <Link href="/transactions" className="text-xs text-blue-600 hover:text-blue-500 transition-colors">See all →</Link>
            </div>

            {recentExpenses.length === 0 ? (
              <div className="rounded-2xl bg-white border border-gray-200 border-dashed px-6 py-10 text-center">
                <p className="text-gray-500 text-sm">No transactions yet</p>
                <p className="text-gray-400 text-xs mt-1">Send a receipt photo to your Telegram bot</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
                {recentExpenses.map((e) => (
                  <div key={e.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-base">
                      {categoryIcon(e.confirmed_category ?? e.ai_suggested_category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {e.merchant ?? e.raw_ocr_text?.slice(0, 40) ?? "—"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-gray-400">{e.date}</span>
                        {(e.confirmed_category ?? e.ai_suggested_category) && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="text-xs text-gray-400 truncate">
                              {e.confirmed_category ?? e.ai_suggested_category}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {e.amount != null ? (
                        <p className="text-sm font-semibold text-gray-900 tabular-nums">
                          {formatCurrency(e.amount, e.currency)}
                        </p>
                      ) : (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {e.status === "pending_ocr" ? "OCR pending" : "No amount"}
                        </span>
                      )}
                      {e.status === "pending_review" && (
                        <p className="text-xs text-blue-500 mt-0.5">Needs review</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 border-t border-gray-200 bg-white flex md:hidden safe-area-bottom z-20">
        <MobileNavItem href="/" icon="⊞" label="Home" active />
        <MobileNavItem href="/review" icon="✓" label="Review" badge={pendingCount > 0} />
        <MobileNavItem href="/transactions" icon="≡" label="Transactions" />
        <MobileNavItem href="/budgets" icon="◎" label="Budgets" />
      </nav>
    </div>
  );
}

function SidebarItem({ href, icon, label, active, badge }: {
  href: string; icon: string; label: string; active?: boolean; badge?: number;
}) {
  return (
    <Link href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        active ? "bg-white/15 text-white" : "text-slate-400 hover:text-white hover:bg-white/10"
      }`}>
      <span className="shrink-0 text-base">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-4">
          {badge}
        </span>
      )}
    </Link>
  );
}

function MobileNavItem({ href, icon, label, active, badge }: {
  href: string; icon: string; label: string; active?: boolean; badge?: boolean;
}) {
  return (
    <Link href={href}
      className={`flex-1 flex flex-col items-center py-2.5 text-xs gap-1 relative transition-colors ${
        active ? "text-blue-600" : "text-gray-400 hover:text-gray-700"
      }`}>
      <span className="text-lg">{icon}</span>
      {label}
      {badge && <span className="absolute top-2 left-1/2 translate-x-1 w-2 h-2 bg-blue-500 rounded-full" />}
    </Link>
  );
}
