"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format";
import TransactionModal from "./TransactionModal";

export interface TxRow {
  id: string;
  payee_name: string | null;
  amount: string | null;
  currency: string;
  date: string;
  status: string;
  source: string;
  direction: string;
  bucket_id: string | null;
  category_id: string | null;
  category_name: string | null;
  notes: string | null;
  receipt_url: string | null;
  flagged: boolean;
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

function TransactionRow({
  tx,
  bucketMap,
  onClick,
}: {
  tx: TxRow;
  bucketMap: Map<string, string>;
  onClick: () => void;
}) {
  const hasAmount = tx.amount != null && tx.status !== "pending_ocr";
  const budgetName = tx.bucket_id ? bucketMap.get(tx.bucket_id) : null;
  const isCredit = tx.direction === "credit";

  return (
    <div
      className="flex md:grid items-center gap-3 md:gap-0 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
      style={{ gridTemplateColumns: "90px 1fr 140px 100px 120px 110px" }}
      onClick={onClick}
    >
      {/* Mobile layout */}
      <div className="md:hidden flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-900 truncate">{tx.payee_name ?? "—"}</p>
          <p className={`text-sm font-semibold tabular-nums shrink-0 ${
            hasAmount
              ? isCredit ? "text-emerald-600" : "text-gray-900"
              : "text-gray-400"
          }`}>
            {hasAmount
              ? `${isCredit ? "+" : ""}${formatCurrency(Number(tx.amount), tx.currency)}`
              : "pending"}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[tx.status] ?? "bg-gray-100 text-gray-500"}`}>
            {STATUS_LABELS[tx.status] ?? tx.status}
          </span>
          {budgetName && <span className="text-xs text-gray-400 truncate">{budgetName}</span>}
        </div>
      </div>

      {/* Desktop layout */}
      <span className="hidden md:block text-sm text-gray-400 tabular-nums">{tx.date}</span>
      <span className="hidden md:block text-sm font-medium text-gray-900 truncate pr-4">
        {tx.payee_name ?? <span className="text-gray-400 italic">No payee</span>}
      </span>
      <span className="hidden md:block text-sm text-gray-500 truncate pr-2">
        {budgetName ?? <span className="text-gray-300">—</span>}
      </span>
      <span className="hidden md:block text-sm text-gray-500 truncate pr-2">
        {tx.category_name ?? <span className="text-gray-300">—</span>}
      </span>
      <span className="hidden md:flex items-center">
        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[tx.status] ?? "bg-gray-100 text-gray-500"}`}>
          {STATUS_LABELS[tx.status] ?? tx.status}
        </span>
      </span>
      <span className={`hidden md:block text-sm font-semibold tabular-nums text-right ${
        hasAmount
          ? isCredit ? "text-emerald-600" : "text-gray-900"
          : "text-gray-400"
      }`}>
        {hasAmount
          ? `${isCredit ? "+" : ""}${formatCurrency(Number(tx.amount), tx.currency)}`
          : "—"}
      </span>
    </div>
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
  const [openTx, setOpenTx] = useState<TxRow | null>(null);
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
      {openTx && (
        <TransactionModal
          tx={openTx}
          budgets={budgets}
          categories={categories}
          onClose={() => setOpenTx(null)}
        />
      )}

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
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">Amount</span>
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
                bucketMap={bucketMap}
                onClick={() => setOpenTx(tx)}
              />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
