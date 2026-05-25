import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { expenses } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import LogoutButton from "@/app/components/LogoutButton";
import { formatCurrency } from "@/lib/format";

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

export default async function TransactionsPage() {
  const user = await requireUser();

  const [allExpenses, pendingCount] = await Promise.all([
    db.select()
      .from(expenses)
      .where(eq(expenses.user_id, user.id))
      .orderBy(desc(expenses.date), desc(expenses.created_at)),

    db.select({ count: sql<number>`count(*)::int` })
      .from(expenses)
      .where(and(eq(expenses.user_id, user.id), sql`status IN ('pending_review', 'pending_ocr')`))
      .then((r) => r[0]?.count ?? 0),
  ]);

  const byDate = new Map<string, typeof allExpenses>();
  for (const e of allExpenses) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date)!.push(e);
  }
  const dateGroups = [...byDate.entries()];

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
          <SidebarItem href="/transactions" icon="≡" label="Transactions" active />
          <SidebarItem href="/accounts" icon="⬡" label="All Accounts" />
          <SidebarItem href="/budgets" icon="◎" label="Budgets" />
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
          <h1 className="text-base font-semibold text-gray-900">Transactions</h1>
          <span className="ml-auto text-xs text-gray-400">{allExpenses.length} total</span>
        </header>

        {/* Desktop header */}
        <div className="hidden md:flex sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-3 items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Transactions</h1>
          <span className="text-xs text-gray-400">{allExpenses.length} total</span>
        </div>

        <main className="px-4 md:px-8 py-4 pb-24 max-w-3xl">
          {dateGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-gray-500 text-sm">No transactions yet</p>
              <p className="text-gray-400 text-xs mt-1">Send a receipt to your Telegram bot to get started</p>
            </div>
          ) : (
            <div className="space-y-6">
              {dateGroups.map(([date, items]) => {
                const dayTotal = items
                  .filter((e) => e.amount != null && e.status !== "pending_ocr")
                  .reduce((sum, e) => sum + Number(e.amount), 0);

                return (
                  <div key={date}>
                    <div className="flex items-baseline justify-between mb-2 px-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        {new Date(date + "T12:00:00").toLocaleDateString("en-JM", {
                          weekday: "short", month: "short", day: "numeric",
                        })}
                      </span>
                      {dayTotal > 0 && (
                        <span className="text-xs text-gray-400 tabular-nums">
                          {formatCurrency(dayTotal, "JMD")}
                        </span>
                      )}
                    </div>
                    <ul className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
                      {items.map((e) => (
                        <li key={e.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">
                              {e.merchant ?? e.raw_ocr_text?.slice(0, 40) ?? "—"}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[e.status] ?? "bg-gray-100 text-gray-500"}`}>
                                {STATUS_LABELS[e.status] ?? e.status}
                              </span>
                              {(e.confirmed_category ?? e.ai_suggested_category) && (
                                <span className="text-xs text-gray-400">
                                  {e.confirmed_category ?? e.ai_suggested_category}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="ml-4 text-right shrink-0">
                            {e.amount != null ? (
                              <p className="font-semibold text-sm text-gray-900 tabular-nums">
                                {formatCurrency(e.amount, e.currency)}
                              </p>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
