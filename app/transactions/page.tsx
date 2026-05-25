import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { expenses } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatCurrency } from "@/lib/format";

const STATUS_LABELS: Record<string, string> = {
  pending_ocr: "OCR pending",
  pending_review: "Needs review",
  confirmed: "Confirmed",
  reconciled: "Reconciled",
};

const STATUS_COLORS: Record<string, string> = {
  pending_ocr: "bg-amber-500/20 text-amber-300",
  pending_review: "bg-blue-500/20 text-blue-300",
  confirmed: "bg-green-500/20 text-green-300",
  reconciled: "bg-zinc-700 text-zinc-300",
};

export default async function TransactionsPage() {
  const user = await requireUser();

  const allExpenses = await db
    .select()
    .from(expenses)
    .where(eq(expenses.user_id, user.id))
    .orderBy(desc(expenses.date), desc(expenses.created_at));

  // Group by date
  const byDate = new Map<string, typeof allExpenses>();
  for (const e of allExpenses) {
    const key = e.date;
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(e);
  }
  const groups = [...byDate.entries()];

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/" className="text-zinc-400 hover:text-white">‹</Link>
          <h1 className="text-base font-semibold">Transactions</h1>
          <span className="ml-auto text-xs text-zinc-500">{allExpenses.length} total</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-zinc-400 text-sm">No expenses yet</p>
            <p className="text-zinc-500 text-xs mt-1">Send a receipt to your Telegram bot to get started</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(([date, items]) => {
              const dayTotal = items
                .filter((e) => e.amount != null && e.status !== "pending_ocr")
                .reduce((sum, e) => sum + Number(e.amount), 0);

              return (
                <div key={date}>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      {new Date(date + "T12:00:00").toLocaleDateString("en-JM", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {dayTotal > 0 && (
                      <span className="text-xs text-zinc-500">
                        {formatCurrency(dayTotal, "JMD")}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {items.map((e) => (
                      <li key={e.id} className="flex items-center justify-between rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {e.merchant ?? e.raw_ocr_text?.slice(0, 40) ?? "—"}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[e.status] ?? "bg-zinc-700 text-zinc-300"}`}
                            >
                              {STATUS_LABELS[e.status] ?? e.status}
                            </span>
                            {(e.confirmed_category ?? e.ai_suggested_category) && (
                              <span className="text-xs text-zinc-500">
                                {e.confirmed_category ?? e.ai_suggested_category}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4 text-right shrink-0">
                          {e.amount != null ? (
                            <p className="font-semibold text-sm">
                              {formatCurrency(e.amount, e.currency)}
                            </p>
                          ) : (
                            <span className="text-xs text-zinc-500">—</span>
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
  );
}
