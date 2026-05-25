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
  pending_ocr: "bg-amber-50 border border-amber-200 text-amber-600",
  pending_review: "bg-blue-50 border border-blue-200 text-blue-600",
  confirmed: "bg-emerald-50 border border-emerald-200 text-emerald-600",
  reconciled: "bg-gray-100 text-gray-500",
};

export default async function TransactionsPage() {
  const user = await requireUser();

  const allExpenses = await db
    .select()
    .from(expenses)
    .where(eq(expenses.user_id, user.id))
    .orderBy(desc(expenses.date), desc(expenses.created_at));

  const byDate = new Map<string, typeof allExpenses>();
  for (const e of allExpenses) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date)!.push(e);
  }
  const groups = [...byDate.entries()];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/" className="text-gray-400 hover:text-gray-700 transition-colors text-lg">‹</Link>
          <h1 className="text-base font-semibold text-gray-900">Transactions</h1>
          <span className="ml-auto text-xs text-gray-400">{allExpenses.length} total</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-gray-500 text-sm">No transactions yet</p>
            <p className="text-gray-400 text-xs mt-1">Send a receipt to your Telegram bot to get started</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(([date, items]) => {
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
  );
}
