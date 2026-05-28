"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import type { TxRow } from "./TransactionListClient";

interface BudgetOption { id: string; name: string; }
interface CategoryOption { id: string; name: string; icon: string | null; }

const inputCls = "w-full rounded-xl bg-white border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const selectCls = "w-full rounded-xl bg-white border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-gray-500 mb-1.5";

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

export default function TransactionModal({
  tx,
  budgets,
  categories,
  onClose,
}: {
  tx: TxRow;
  budgets: BudgetOption[];
  categories: CategoryOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [payeeName, setPayeeName] = useState(tx.payee_name ?? "");
  const [amount, setAmount] = useState(tx.amount ?? "");
  const [currency, setCurrency] = useState(tx.currency ?? "JMD");
  const [date, setDate] = useState(tx.date ?? "");
  const [categoryId, setCategoryId] = useState(tx.category_id ?? "");
  const [budgetId, setBudgetId] = useState(tx.bucket_id ?? "");
  const [notes, setNotes] = useState(tx.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  async function save() {
    setSaving(true);
    await fetch(`/api/transactions/${tx.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payee_name: payeeName || null,
        amount: amount !== "" ? Number(amount) : null,
        currency,
        date,
        bucket_id: budgetId || null,
        category_id: categoryId || null,
        notes: notes || null,
        status: tx.status === "pending_review" || tx.status === "pending_ocr"
          ? "confirmed"
          : tx.status,
      }),
    });
    setSaving(false);
    onClose();
    router.refresh();
  }

  async function deleteTransaction() {
    if (!confirm("Delete this transaction? This cannot be undone.")) return;
    setDeleting(true);
    await fetch(`/api/transactions/${tx.id}`, { method: "DELETE" });
    setDeleting(false);
    onClose();
    router.refresh();
  }

  const hasAmount = tx.amount != null && tx.status !== "pending_ocr";
  const isCredit = tx.direction === "credit";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full md:max-w-lg bg-white rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] md:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-900 truncate">
              {tx.payee_name ?? "No payee"}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[tx.status] ?? "bg-gray-100 text-gray-500"}`}>
                {STATUS_LABELS[tx.status] ?? tx.status}
              </span>
              <span className="text-xs text-gray-400 capitalize">{tx.source}</span>
              {hasAmount && (
                <span className={`ml-auto text-sm font-semibold tabular-nums ${isCredit ? "text-emerald-600" : "text-gray-900"}`}>
                  {isCredit ? "+" : ""}{formatCurrency(Number(tx.amount), tx.currency)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Receipt image */}
        {tx.receipt_url && (
          <a href={tx.receipt_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tx.receipt_url}
              alt="Receipt"
              className="w-full max-h-40 object-cover object-top"
            />
          </a>
        )}

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Payee</label>
              <input
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                placeholder="Business name"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={selectCls}>
                {["JMD", "USD", "GBP", "EUR", "CAD"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={selectCls}>
                <option value="">— no category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon ? `${c.icon} ` : ""}{c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Budget</label>
              <select value={budgetId} onChange={(e) => setBudgetId(e.target.value)} className={selectCls}>
                <option value="">— no budget —</option>
                {budgets.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a note…"
                rows={2}
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 pb-5 pt-3 border-t border-gray-100 shrink-0 flex gap-2">
          <button
            onClick={deleteTransaction}
            disabled={deleting}
            className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 hover:border-red-200 disabled:opacity-50 transition-colors"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2.5 text-xs font-semibold text-white transition-colors"
          >
            {saving ? "Saving…" : tx.status === "pending_review" || tx.status === "pending_ocr" ? "Confirm" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
