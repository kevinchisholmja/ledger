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

function categoryIcon(cat: string | null | undefined): string {
  const map: Record<string, string> = {
    "Food & Drink": "🍽️",
    Groceries: "🛒",
    Transport: "🚗",
    Utilities: "⚡",
    Shopping: "🛍️",
    Health: "💊",
    Entertainment: "🎬",
    Travel: "✈️",
    Business: "💼",
  };
  return map[cat ?? ""] ?? "💳";
}

export default async function DashboardPage() {
  const user = await requireUser();

  const [recentExpenses, pendingCount, budgetSummaries] = await Promise.all([
    db
      .select()
      .from(expenses)
      .where(eq(expenses.user_id, user.id))
      .orderBy(desc(expenses.created_at))
      .limit(8),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(expenses)
      .where(
        and(
          eq(expenses.user_id, user.id),
          or(eq(expenses.status, "pending_review"), eq(expenses.status, "pending_ocr"))
        )
      )
      .then((r) => r[0]?.count ?? 0),

    db
      .execute(
        sql`SELECT * FROM buckets_summary WHERE user_id = ${user.id} ORDER BY (month_spent::numeric / NULLIF(amount::numeric, 0)) DESC NULLS LAST`
      )
      .then((r) => r as unknown as BucketSummaryRow[]),
  ]);

  const firstName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    (user.user_metadata?.name as string | undefined)?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    "there";

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-JM", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const monthName = now.toLocaleDateString("en-JM", { month: "long" });

  const totalBudget = budgetSummaries.reduce((s, b) => s + Number(b.amount), 0);
  const totalSpent = budgetSummaries.reduce((s, b) => s + Number(b.month_spent), 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">

      {/* ── Sidebar (desktop) ─────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-56 flex-col fixed inset-y-0 border-r border-zinc-800/60 bg-zinc-950 z-20">
        <div className="px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow shadow-blue-600/40">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="font-semibold text-white tracking-tight">Ledger</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5">
          <SidebarItem href="/" icon="⊞" label="Dashboard" active />
          <SidebarItem href="/review" icon="✓" label="Review" badge={pendingCount > 0 ? pendingCount : undefined} />
          <SidebarItem href="/transactions" icon="≡" label="Transactions" />
          <SidebarItem href="/budgets" icon="◎" label="Budgets" />
        </nav>

        <div className="px-3 pb-5 pt-3 border-t border-zinc-800/60 space-y-2">
          <p className="px-3 text-xs text-zinc-600 truncate">{user.email}</p>
          <div className="px-3">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 md:pl-56 min-w-0 pb-20 md:pb-0">

        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-10 border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">L</span>
            </div>
            <span className="font-semibold tracking-tight">Ledger</span>
          </div>
          <Link
            href="/review"
            className="relative p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <span className="text-lg">✓</span>
            {pendingCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
            )}
          </Link>
        </header>

        <main className="px-4 md:px-8 lg:px-10 py-6 md:py-8 max-w-4xl">

          {/* Greeting */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-white capitalize">Hello, {firstName}</h1>
            <p className="text-zinc-500 text-sm mt-0.5">{dateStr}</p>
          </div>

          {/* Pending banner */}
          {pendingCount > 0 && (
            <Link
              href="/review"
              className="flex items-center justify-between rounded-2xl bg-blue-600/15 border border-blue-500/25 px-5 py-4 mb-7 hover:bg-blue-600/20 transition-colors group"
            >
              <div>
                <p className="font-semibold text-blue-200">
                  {pendingCount} {pendingCount === 1 ? "transaction" : "transactions"} to review
                </p>
                <p className="text-sm text-blue-300/60 mt-0.5">Tap to confirm and categorise</p>
              </div>
              <span className="text-blue-400 text-xl group-hover:translate-x-0.5 transition-transform">›</span>
            </Link>
          )}

          {/* Summary stats */}
          {budgetSummaries.length > 0 && (
            <div className="grid grid-cols-3 gap-3 md:gap-4 mb-7">
              <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 px-4 py-4">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Budget</p>
                <p className="text-lg md:text-xl font-bold text-white mt-1 tabular-nums">
                  {formatCurrency(totalBudget, "JMD")}
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">{monthName}</p>
              </div>
              <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 px-4 py-4">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Spent</p>
                <p className={`text-lg md:text-xl font-bold mt-1 tabular-nums ${overallPct >= 100 ? "text-red-400" : "text-white"}`}>
                  {formatCurrency(totalSpent, "JMD")}
                </p>
                <p className={`text-xs mt-0.5 ${overallPct >= 100 ? "text-red-400" : overallPct >= 80 ? "text-amber-400" : "text-emerald-400"}`}>
                  {overallPct.toFixed(0)}% of budget
                </p>
              </div>
              <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 px-4 py-4">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                  {totalRemaining >= 0 ? "Remaining" : "Over by"}
                </p>
                <p className={`text-lg md:text-xl font-bold mt-1 tabular-nums ${totalRemaining < 0 ? "text-red-400" : "text-white"}`}>
                  {formatCurrency(Math.abs(totalRemaining), "JMD")}
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">{monthName}</p>
              </div>
            </div>
          )}

          {/* Budget list — Copilot-style */}
          {budgetSummaries.length > 0 ? (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-white">Budgets</h2>
                <Link href="/budgets" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  Manage →
                </Link>
              </div>

              {/* Column headers — desktop only */}
              <div className="hidden md:flex items-center px-4 mb-1 gap-4">
                <div className="flex-1" />
                <span className="w-32 text-right text-xs font-semibold uppercase tracking-wider text-zinc-600">Spent</span>
                <div className="w-40" />
                <span className="w-32 text-xs font-semibold uppercase tracking-wider text-zinc-600">Budget</span>
              </div>

              <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 overflow-hidden divide-y divide-zinc-800/60">
                {budgetSummaries.map((b) => {
                  const allocated = Number(b.amount);
                  const spent = Number(b.month_spent);
                  const remaining = Number(b.month_remaining);
                  const pct = allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;
                  const over = spent > allocated;
                  const cur = b.currency ?? "JMD";

                  return (
                    <div key={b.bucket_id} className="px-4 py-3.5">
                      {/* Mobile layout */}
                      <div className="md:hidden">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {b.icon ? (
                              <span className="text-lg shrink-0">{b.icon}</span>
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                                <span className="text-zinc-400 text-xs font-bold">{b.bucket_name[0]}</span>
                              </div>
                            )}
                            <span className="text-sm font-medium truncate">{b.bucket_name}</span>
                          </div>
                          <span className={`text-xs font-medium shrink-0 ml-2 ${over ? "text-red-400" : remaining < allocated * 0.2 ? "text-amber-400" : "text-zinc-400"}`}>
                            {over
                              ? `${formatCurrency(Math.abs(remaining), cur)} over`
                              : `${formatCurrency(remaining, cur)} left`}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-zinc-800 mb-1.5">
                          <div className={`h-full rounded-full ${barColor(over ? 100 : pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-zinc-600">
                          <span>{formatCurrency(spent, cur)}</span>
                          <span>of {formatCurrency(allocated, cur)}</span>
                        </div>
                      </div>

                      {/* Desktop — Copilot: icon+name | spent | bar | budget */}
                      <div className="hidden md:flex items-center gap-4">
                        <div className="flex-1 flex items-center gap-3 min-w-0">
                          {b.icon ? (
                            <span className="text-xl w-8 text-center shrink-0">{b.icon}</span>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                              <span className="text-zinc-400 text-xs font-bold">{b.bucket_name[0]}</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{b.bucket_name}</p>
                            <p className="text-xs text-zinc-600 capitalize">{b.period}</p>
                          </div>
                        </div>

                        <span className={`w-32 text-right text-sm font-semibold tabular-nums shrink-0 ${over ? "text-red-400" : "text-white"}`}>
                          {formatCurrency(spent, cur)}
                        </span>

                        <div className="w-40 h-2 rounded-full bg-zinc-800 shrink-0">
                          <div
                            className={`h-full rounded-full ${barColor(over ? 100 : pct)}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>

                        <span className="w-32 text-sm text-zinc-500 tabular-nums shrink-0">
                          {formatCurrency(allocated, cur)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : (
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 border-dashed px-6 py-12 text-center mb-8">
              <p className="text-zinc-400 font-medium">No budgets yet</p>
              <p className="text-zinc-600 text-sm mt-1.5">Create a budget to start tracking your spending</p>
              <Link
                href="/budgets"
                className="inline-block mt-5 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-medium text-white transition-colors"
              >
                Create budget
              </Link>
            </div>
          )}

          {/* Recent transactions */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-white">Recent</h2>
              <Link href="/transactions" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                See all →
              </Link>
            </div>

            {recentExpenses.length === 0 ? (
              <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 border-dashed px-6 py-10 text-center">
                <p className="text-zinc-500 text-sm">No transactions yet</p>
                <p className="text-zinc-600 text-xs mt-1">Send a receipt photo to your Telegram bot</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 overflow-hidden divide-y divide-zinc-800/60">
                {recentExpenses.map((e) => (
                  <div key={e.id} className="flex items-center gap-4 px-4 py-3.5">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 text-base">
                      {categoryIcon(e.confirmed_category ?? e.ai_suggested_category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {e.merchant ?? e.raw_ocr_text?.slice(0, 40) ?? "—"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-zinc-500">{e.date}</span>
                        {(e.confirmed_category ?? e.ai_suggested_category) && (
                          <>
                            <span className="text-zinc-700">·</span>
                            <span className="text-xs text-zinc-500 truncate">
                              {e.confirmed_category ?? e.ai_suggested_category}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {e.amount != null ? (
                        <p className="text-sm font-semibold tabular-nums">
                          {formatCurrency(e.amount, e.currency)}
                        </p>
                      ) : (
                        <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">
                          {e.status === "pending_ocr" ? "OCR pending" : "No amount"}
                        </span>
                      )}
                      {e.status === "pending_review" && (
                        <p className="text-xs text-blue-400 mt-0.5">Needs review</p>
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
      <nav className="fixed bottom-0 inset-x-0 border-t border-zinc-800/60 bg-zinc-950/95 backdrop-blur-sm flex md:hidden safe-area-bottom z-20">
        <MobileNavItem href="/" icon="⊞" label="Home" active />
        <MobileNavItem href="/review" icon="✓" label="Review" badge={pendingCount > 0} />
        <MobileNavItem href="/transactions" icon="≡" label="Transactions" />
        <MobileNavItem href="/budgets" icon="◎" label="Budgets" />
      </nav>
    </div>
  );
}

function SidebarItem({
  href,
  icon,
  label,
  active,
  badge,
}: {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        active
          ? "bg-blue-600/15 text-blue-400"
          : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
      }`}
    >
      <span className="shrink-0 text-base">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-4">
          {badge}
        </span>
      )}
    </Link>
  );
}

function MobileNavItem({
  href,
  icon,
  label,
  active,
  badge,
}: {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
  badge?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex-1 flex flex-col items-center py-2.5 text-xs gap-1 relative transition-colors ${
        active ? "text-blue-400" : "text-zinc-500 hover:text-white"
      }`}
    >
      <span className="text-lg">{icon}</span>
      {label}
      {badge && (
        <span className="absolute top-2 left-1/2 translate-x-1 w-2 h-2 bg-blue-500 rounded-full" />
      )}
    </Link>
  );
}
