"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/format";

export interface TxRow {
  id: string;
  merchant: string | null;
  amount: string | null;
  currency: string;
  date: string;
  status: string;
  source: string;
  bucket_id: string | null;
  category_id: string | null;
  confirmed_category: string | null;
}

interface BudgetOption { id: string; name: string; }
interface CategoryOption { id: string; name: string; icon: string | null; }

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

const selectCls = "rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

function TransactionRow({
  tx,
  budgets,
  categories,
  bucketMap,
}: {
  tx: TxRow;
  budgets: BudgetOption[];
  categories: CategoryOption[];
  bucketMap: Map<string, string>;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [budgetId, setBudgetId] = useState(tx.bucket_id ?? "");
  const [categoryId, setCategoryId] = useState(tx.category_id ?? "");
  const [saving, setSaving] = useState(false);

  const hasAmount = tx.amount != null && tx.status !== "pending_ocr";
  const budgetName = tx.bucket_id ? bucketMap.get(tx.bucket_id) : null;
  const categoryName = tx.confirmed_category;

  async function save() {
    setSaving(true);
    const selectedCat = categories.find((c) => c.id === categoryId);
    await fetch(`/api/expenses/${tx.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bucket_id: budgetId || null,
        confirmed_category: selectedCat?.name ?? null,
        category_id: categoryId || null,
        status: tx.status === "pending_review" || tx.status === "pending_ocr" ? "confirmed" : tx.status,
      }),
    });
    setSaving(false);
    setExpanded(false);
    router.refresh();
  }

  return (
    <>
      {/* Main row */}
      <div
        className={`flex md:grid items-center gap-3 md:gap-0 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${expanded ? "bg-blue-50/30" : ""}`}
        style={{ gridTemplateColumns: "90px 1fr 140px 100px 120px 110px" }}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Mobile */}
        <div className="md:hidden flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-900 truncate">{tx.merchant ?? "—"}</p>
            <p className={`text-sm font-semibold tabular-nums shrink-0 ${hasAmount ? "text-gray-900" : "text-gray-400"}`}>
              {hasAmount ? formatCurrency(Number(tx.amount), tx.currency) : "pending"}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[tx.status] ?? "bg-gray-100 text-gray-500"}`}>
              {STATUS_LABELS[tx.status] ?? tx.status}
            </span>
            {budgetName && <span className="text-xs text-gray-400 truncate">{budgetName}</span>}
          </div>
        </div>

        {/* Desktop */}
        <span className="hidden md:block text-sm text-gray-400 tabular-nums">{tx.date}</span>
        <span className="hidden md:block text-sm font-medium text-gray-900 truncate pr-4">
          {tx.merchant ?? <span className="text-gray-400 italic">No merchant</span>}
        </span>
        <span className="hidden md:block text-sm text-gray-500 truncate pr-2">
          {budgetName ?? <span className="text-gray-300">—</span>}
        </span>
        <span className="hidden md:block text-sm text-gray-500 truncate pr-2">
          {categoryName ?? <span className="text-gray-300">—</span>}
        </span>
        <span className="hidden md:flex items-center">
          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[tx.status] ?? "bg-gray-100 text-gray-500"}`}>
            {STATUS_LABELS[tx.status] ?? tx.status}
          </span>
        </span>
        <span className={`hidden md:block text-sm font-semibold tabular-nums text-right ${hasAmount ? "text-gray-900" : "text-gray-400"}`}>
          {hasAmount ? formatCurrency(Number(tx.amount), tx.currency) : "—"}
        </span>
      </div>

      {/* Expanded assignment panel */}
      {expanded && (
        <div className="px-4 py-3 border-t border-blue-100 bg-blue-50/40 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs font-medium text-gray-500">Budget</label>
            <select
              value={budgetId}
              onChange={(e) => setBudgetId(e.target.value)}
              className={selectCls}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="">— no budget —</option>
              {budgets.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs font-medium text-gray-500">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={selectCls}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="">— no category —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon ? `${c.icon} ` : ""}{c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pb-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); save(); }}
              disabled={saving}
              className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-1.5 text-xs font-semibold text-white transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function TransactionListClient({
  transactions,
  budgets,
  categories,
}: {
  transactions: TxRow[];
  budgets: BudgetOption[];
  categories: CategoryOption[];
}) {
  const bucketMap = new Map(budgets.map((b) => [b.id, b.name]));

  const byDate = new Map<string, TxRow[]>();
  for (const tx of transactions) {
    if (!byDate.has(tx.date)) byDate.set(tx.date, []);
    byDate.get(tx.date)!.push(tx);
  }
  const dateGroups = [...byDate.entries()];

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl bg-white border border-gray-200">
        <p className="text-gray-500 font-medium">No transactions yet</p>
        <p className="text-gray-400 text-sm mt-1.5">Send a receipt to your Telegram bot to get started</p>
      </div>
    );
  }

  return (
    <>
      {/* Column headers — desktop */}
      <div
        className="hidden md:grid border-b border-gray-200 bg-gray-50 rounded-t-2xl px-4 py-2"
        style={{ gridTemplateColumns: "90px 1fr 140px 100px 120px 110px" }}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Date</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Payee</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Budget</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Category</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Status</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">Outflow</span>
      </div>

      <div className="rounded-b-2xl md:rounded-t-none rounded-2xl bg-white border border-gray-200 overflow-hidden divide-y divide-gray-100">
        {dateGroups.map(([date, items]) => (
          <div key={date}>
            <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-400">
                {new Date(date + "T12:00:00").toLocaleDateString("en-JM", {
                  weekday: "short", month: "short", day: "numeric", year: "numeric",
                })}
              </span>
            </div>
            {items.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                budgets={budgets}
                categories={categories}
                bucketMap={bucketMap}
              />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
