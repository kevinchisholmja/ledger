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

function spendColor(pct: number): string {
  if (pct >= 100) return "bg-red-500";
  if (pct >= 80) return "bg-amber-400";
  return "bg-blue-500";
}

function spendTextColor(pct: number): string {
  if (pct >= 100) return "text-red-400";
  if (pct >= 80) return "text-amber-400";
  return "text-blue-400";
}

export default async function DashboardPage() {
  const user = await requireUser();

  const [recentExpenses, pendingCount, budgetSummaries] = await Promise.all([
    db
      .select()
      .from(expenses)
      .where(eq(expenses.user_id, user.id))
      .orderBy(desc(expenses.created_at))
      .limit(5),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(expenses)
      .where(
        and(
          eq(expenses.user_id, user.id),
          or(
            eq(expenses.status, "pending_review"),
            eq(expenses.status, "pending_ocr")
          )
        )
      )
      .then((r) => r[0]?.count ?? 0),

    db
      .execute(
        sql`SELECT * FROM buckets_summary WHERE user_id = ${user.id} ORDER BY (month_spent::numeric / NULLIF(amount::numeric, 0)) DESC NULLS LAST`
      )
      .then((r) => r as unknown as BucketSummaryRow[]),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <span className="text-lg font-bold tracking-tight">Ledger</span>
          <nav className="flex items-center gap-4 text-sm text-zinc-400">
            <Link href="/review" className="hover:text-white transition-colors">Review</Link>
            <Link href="/transactions" className="hover:text-white transition-colors">Transactions</Link>
            <Link href="/budgets" className="hover:text-white transition-colors">Budgets</Link>
            <LogoutButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Pending banner */}
        {pendingCount > 0 && (
          <Link
            href="/review"
            className="flex items-center justify-between rounded-xl bg-blue-600/20 border border-blue-500/30 px-4 py-3 hover:bg-blue-600/30 transition-colors"
          >
            <div>
              <p className="font-medium text-blue-200">
                {pendingCount} {pendingCount === 1 ? "transaction" : "transactions"} need review
              </p>
              <p className="text-sm text-blue-300/70 mt-0.5">Tap to confirm or categorise</p>
            </div>
            <span className="text-blue-300 text-lg">›</span>
          </Link>
        )}

        {/* Budget cards */}
        {budgetSummaries.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Budgets</h2>
              <Link href="/budgets" className="text-xs text-blue-400 hover:text-blue-300">Manage</Link>
            </div>
            <div className="space-y-3">
              {budgetSummaries.map((b) => {
                const allocated = Number(b.amount);
                const spent = Number(b.month_spent);
                const remaining = Number(b.month_remaining);
                const yearSpent = Number(b.year_spent);
                const pct = allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;
                const overBudget = spent > allocated;

                return (
                  <div key={b.bucket_id} className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {b.icon && <span className="text-base">{b.icon}</span>}
                        <p className="font-medium text-sm truncate">{b.bucket_name}</p>
                        <span className="text-xs text-zinc-500 capitalize shrink-0">{b.period}</span>
                      </div>
                      <p className={`text-xs font-medium shrink-0 ml-3 ${spendTextColor(overBudget ? 100 : pct)}`}>
                        {overBudget
                          ? `${formatCurrency(Math.abs(remaining), b.currency ?? "JMD")} over`
                          : `${formatCurrency(remaining, b.currency ?? "JMD")} left`}
                      </p>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all ${spendColor(overBudget ? 100 : pct)}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>
                        {formatCurrency(spent, b.currency ?? "JMD")} spent
                      </span>
                      <span>
                        of {formatCurrency(allocated, b.currency ?? "JMD")}
                      </span>
                    </div>
                    {yearSpent > 0 && (
                      <p className="text-xs text-zinc-600 mt-1">
                        {formatCurrency(yearSpent, b.currency ?? "JMD")} this year
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Recent transactions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Recent</h2>
            <Link href="/transactions" className="text-xs text-blue-400 hover:text-blue-300">See all</Link>
          </div>
          {recentExpenses.length === 0 ? (
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-8 text-center">
              <p className="text-zinc-400 text-sm">No transactions yet</p>
              <p className="text-zinc-500 text-xs mt-1">Send a receipt photo to your Telegram bot</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {recentExpenses.map((e) => (
                <li key={e.id} className="flex items-center justify-between rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {e.merchant ?? e.raw_ocr_text?.slice(0, 40) ?? "—"}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {e.date} · {e.confirmed_category ?? e.ai_suggested_category ?? "Uncategorised"}
                    </p>
                  </div>
                  <div className="ml-4 text-right shrink-0">
                    {e.amount != null ? (
                      <p className="font-semibold text-sm">
                        {formatCurrency(e.amount, e.currency)}
                      </p>
                    ) : (
                      <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                        {e.status === "pending_ocr" ? "OCR pending" : "No amount"}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {/* Bottom nav for mobile */}
      <nav className="fixed bottom-0 inset-x-0 border-t border-zinc-800 bg-zinc-950 flex safe-area-bottom">
        <Link href="/" className="flex-1 flex flex-col items-center py-2 text-blue-400 text-xs gap-1">
          <span className="text-lg">⊞</span>
          Home
        </Link>
        <Link href="/review" className="flex-1 flex flex-col items-center py-2 text-zinc-400 hover:text-white text-xs gap-1 relative">
          <span className="text-lg">✓</span>
          Review
          {pendingCount > 0 && (
            <span className="absolute top-1.5 right-1/4 w-2 h-2 rounded-full bg-blue-500" />
          )}
        </Link>
        <Link href="/transactions" className="flex-1 flex flex-col items-center py-2 text-zinc-400 hover:text-white text-xs gap-1">
          <span className="text-lg">≡</span>
          Transactions
        </Link>
        <Link href="/budgets" className="flex-1 flex flex-col items-center py-2 text-zinc-400 hover:text-white text-xs gap-1">
          <span className="text-lg">◎</span>
          Budgets
        </Link>
      </nav>
      {/* Spacer for fixed bottom nav */}
      <div className="h-16" />
    </div>
  );
}
