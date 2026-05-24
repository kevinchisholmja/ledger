import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { expenses, buckets } from "@/lib/db/schema";
import { eq, and, or, inArray, desc, sql } from "drizzle-orm";

export default async function DashboardPage() {
  const user = await requireUser();

  const [recentExpenses, pendingCount, allBuckets] = await Promise.all([
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
      .select()
      .from(buckets)
      .where(eq(buckets.user_id, user.id))
      .orderBy(buckets.name),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <span className="text-lg font-bold tracking-tight">Ledger</span>
          <nav className="flex items-center gap-4 text-sm text-zinc-400">
            <Link href="/review" className="hover:text-white transition-colors">Review</Link>
            <Link href="/expenses" className="hover:text-white transition-colors">Expenses</Link>
            <Link href="/buckets" className="hover:text-white transition-colors">Buckets</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Pending banner */}
        {pendingCount > 0 && (
          <Link
            href="/review"
            className="flex items-center justify-between rounded-xl bg-indigo-600/20 border border-indigo-500/30 px-4 py-3 hover:bg-indigo-600/30 transition-colors"
          >
            <div>
              <p className="font-medium text-indigo-200">
                {pendingCount} {pendingCount === 1 ? "expense" : "expenses"} need review
              </p>
              <p className="text-sm text-indigo-300/70 mt-0.5">Tap to confirm or categorise</p>
            </div>
            <span className="text-indigo-300 text-lg">›</span>
          </Link>
        )}

        {/* Buckets */}
        {allBuckets.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Budgets</h2>
              <Link href="/buckets" className="text-xs text-indigo-400 hover:text-indigo-300">Manage</Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {allBuckets.map((b) => (
                <div key={b.id} className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3">
                  <p className="text-xs text-zinc-400 truncate">{b.name}</p>
                  <p className="text-xl font-semibold mt-1">
                    {Number(b.amount).toLocaleString("en-JM", {
                      style: "currency",
                      currency: "JMD",
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5 capitalize">{b.period}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent expenses */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Recent</h2>
            <Link href="/expenses" className="text-xs text-indigo-400 hover:text-indigo-300">See all</Link>
          </div>
          {recentExpenses.length === 0 ? (
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-8 text-center">
              <p className="text-zinc-400 text-sm">No expenses yet</p>
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
                        {e.currency === "JMD"
                          ? `J$${Number(e.amount).toLocaleString()}`
                          : `${e.currency} ${e.amount}`}
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
        <Link href="/" className="flex-1 flex flex-col items-center py-2 text-indigo-400 text-xs gap-1">
          <span className="text-lg">⊞</span>
          Home
        </Link>
        <Link href="/review" className="flex-1 flex flex-col items-center py-2 text-zinc-400 hover:text-white text-xs gap-1 relative">
          <span className="text-lg">✓</span>
          Review
          {pendingCount > 0 && (
            <span className="absolute top-1.5 right-1/4 w-2 h-2 rounded-full bg-indigo-500" />
          )}
        </Link>
        <Link href="/expenses" className="flex-1 flex flex-col items-center py-2 text-zinc-400 hover:text-white text-xs gap-1">
          <span className="text-lg">≡</span>
          Expenses
        </Link>
        <Link href="/buckets" className="flex-1 flex flex-col items-center py-2 text-zinc-400 hover:text-white text-xs gap-1">
          <span className="text-lg">◎</span>
          Buckets
        </Link>
      </nav>
      {/* Spacer for fixed bottom nav */}
      <div className="h-16" />
    </div>
  );
}
