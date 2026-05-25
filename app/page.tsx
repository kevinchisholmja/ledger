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

function AvailablePill({ remaining, allocated }: { remaining: number; allocated: number }) {
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
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 tabular-nums">
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

  const isOver = totalRemaining < 0;
  const isClose = !isOver && overallPct >= 80;
  const bannerBg = isOver ? "bg-red-600" : isClose ? "bg-blue-600" : "bg-emerald-600";
  const bannerLabel = isOver
    ? "You've gone over budget this month"
    : isClose
    ? "You're close to your budget limit"
    : "Available this month";

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">

      {/* ── Column 1: dark navy sidebar (fixed) ─────────────────────────── */}
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
          <SidebarItem href="/" icon="⊞" label="Dashboard" active />
          <SidebarItem href="/review" icon="✓" label="Review" badge={pendingCount > 0 ? pendingCount : undefined} />
          <SidebarItem href="/transactions" icon="≡" label="Transactions" />
          <SidebarItem href="/budgets" icon="◎" label="Budgets" />
        </nav>

        <div className="px-3 pb-5 pt-3 border-t border-white/10 space-y-2">
          <p className="px-3 text-xs text-slate-500 truncate">{user.email}</p>
          <div className="px-3"><LogoutButton /></div>
        </div>
      </aside>

      {/* ── Columns 2 + 3: center and right panel ───────────────────────── */}
      <div className="flex-1 md:pl-56 flex min-h-screen">

        {/* ── Column 2: banner + main content ─────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col">

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

          {/* Status banner — always visible */}
          <div className={`${bannerBg} px-6 md:px-8 py-5 md:py-6 flex items-center justify-between gap-6`}>
            <div>
              <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">
                {monthName} {now.getFullYear()}
              </p>
              <p className="text-white text-3xl md:text-4xl font-bold tabular-nums leading-none">
                {isOver ? "−" : ""}{formatCurrency(Math.abs(totalRemaining), "JMD")}
              </p>
              <p className="text-white/80 text-sm mt-1.5">{bannerLabel}</p>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-2 shrink-0 text-right">
              <p className="text-white/60 text-xs">
                <span className="font-semibold text-white">{formatCurrency(totalSpent, "JMD")}</span>
                {" "}of{" "}
                <span className="font-semibold text-white">{formatCurrency(totalBudget, "JMD")}</span>
                {" "}spent
              </p>
              <div className="w-36 h-1.5 rounded-full bg-white/25 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white/75"
                  style={{ width: `${Math.min(overallPct, 100)}%` }}
                />
              </div>
              <p className="text-white/50 text-xs">{overallPct.toFixed(0)}% of budget used</p>
            </div>
          </div>

          {/* Scrollable main content */}
          <main className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-10 space-y-6">

            {/* Greeting */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 capitalize">Hello, {firstName}</h1>
              <p className="text-gray-400 text-sm mt-0.5">{dateStr}</p>
            </div>

            {/* Pending review nudge */}
            {pendingCount > 0 && (
              <Link href="/review"
                className="flex items-center justify-between rounded-2xl bg-blue-50 border border-blue-200 px-5 py-4 hover:bg-blue-100 transition-colors group">
                <div>
                  <p className="font-semibold text-blue-700">
                    {pendingCount} {pendingCount === 1 ? "transaction" : "transactions"} to review
                  </p>
                  <p className="text-sm text-blue-500 mt-0.5">Tap to confirm and categorise</p>
                </div>
                <span className="text-blue-400 text-xl group-hover:translate-x-0.5 transition-transform">›</span>
              </Link>
            )}

            {/* Budgets */}
            {budgetSummaries.length > 0 ? (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900">Budgets</h2>
                  <Link href="/budgets" className="text-xs text-blue-600 hover:text-blue-500 transition-colors">Manage →</Link>
                </div>

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
                        {/* Mobile layout */}
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
                            <AvailablePill remaining={remaining} allocated={allocated} />
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-100 mb-1.5">
                            <div className={`h-full rounded-full ${barColor(over ? 100 : pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>{formatCurrency(spent, cur)} spent</span>
                            <span>of {formatCurrency(allocated, cur)}</span>
                          </div>
                        </div>

                        {/* Desktop layout */}
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
                          <span className="text-sm text-gray-500 tabular-nums text-right">{formatCurrency(allocated, cur)}</span>
                          <div className="h-2 rounded-full bg-gray-100">
                            <div className={`h-full rounded-full ${barColor(over ? 100 : pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <div className="flex justify-end">
                            <AvailablePill remaining={remaining} allocated={allocated} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : (
              <div className="rounded-2xl bg-white border border-gray-200 border-dashed px-6 py-12 text-center">
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

        {/* ── Column 3: right summary panel (always visible on md+) ─────── */}
        <aside className="hidden md:flex w-72 flex-col border-l border-gray-200 bg-white sticky top-0 h-screen overflow-y-auto shrink-0">
          {/* Month summary */}
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">{monthName}&apos;s Summary</h3>
          </div>

          <div className="flex-1 p-5 space-y-6">
            {/* Stats */}
            <div className="space-y-3">
              <SummaryRow label="Left Over from Last Month" value="—" muted />
              <SummaryRow
                label={`Assigned in ${monthName}`}
                value={formatCurrency(totalBudget, "JMD")}
              />
              <SummaryRow
                label="Activity"
                value={formatCurrency(totalSpent, "JMD")}
              />
              <div className="border-t border-gray-100 pt-3">
                <SummaryRow
                  label="Available"
                  value={`${isOver ? "−" : ""}${formatCurrency(Math.abs(totalRemaining), "JMD")}`}
                  color={isOver ? "text-red-600" : "text-emerald-600"}
                  bold
                />
              </div>
            </div>

            {/* Overall progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Budget Health</p>
                <span className={`text-xs font-semibold ${isOver ? "text-red-500" : isClose ? "text-amber-500" : "text-emerald-500"}`}>
                  {overallPct.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor(overallPct)}`}
                  style={{ width: `${Math.min(overallPct, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {budgetSummaries.length} {budgetSummaries.length === 1 ? "budget" : "budgets"} tracked
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Placeholder sections — wire up later */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Targets</p>
              <p className="text-sm text-gray-400 italic">Coming soon</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Assigned in Future Months</p>
              <p className="text-sm text-gray-400">June — <span className="text-gray-500">$0.00</span></p>
            </div>

            {/* Quick nav */}
            <div className="border-t border-gray-100 pt-4 space-y-1">
              <Link href="/budgets"
                className="flex items-center justify-between py-2 px-3 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <span>Manage budgets</span>
                <span className="text-gray-400 text-xs">›</span>
              </Link>
              <Link href="/transactions"
                className="flex items-center justify-between py-2 px-3 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <span>All transactions</span>
                <span className="text-gray-400 text-xs">›</span>
              </Link>
              {pendingCount > 0 && (
                <Link href="/review"
                  className="flex items-center justify-between py-2 px-3 rounded-xl text-sm text-blue-600 hover:bg-blue-50 transition-colors">
                  <span>{pendingCount} pending review</span>
                  <span className="text-blue-400 text-xs">›</span>
                </Link>
              )}
            </div>
          </div>
        </aside>

        {/* Mobile summary (stacks below recent) — rendered inside main scroll on small screens */}
      </div>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 border-t border-gray-200 bg-white flex md:hidden z-20">
        <MobileNavItem href="/" icon="⊞" label="Home" active />
        <MobileNavItem href="/review" icon="✓" label="Review" badge={pendingCount > 0} />
        <MobileNavItem href="/transactions" icon="≡" label="Transactions" />
        <MobileNavItem href="/budgets" icon="◎" label="Budgets" />
      </nav>
    </div>
  );
}

function SummaryRow({ label, value, muted, bold, color }: {
  label: string; value: string; muted?: boolean; bold?: boolean; color?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-gray-500 truncate">{label}</span>
      <span className={`text-sm tabular-nums shrink-0 ${bold ? "font-bold" : "font-semibold"} ${muted ? "text-gray-400" : color ?? "text-gray-900"}`}>
        {value}
      </span>
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
