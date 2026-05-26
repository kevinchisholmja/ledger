"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Expense, Category } from "@/lib/db/schema";

interface BudgetOption { id: string; name: string; }
interface Props { expense: Expense; categories: Category[]; budgets: BudgetOption[]; }

const inputCls = "w-full rounded-xl bg-white border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const selectCls = "w-full rounded-xl bg-white border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-gray-500 mb-1.5";

export default function ReviewCard({ expense, categories, budgets }: Props) {
  const router = useRouter();
  const [merchant, setMerchant] = useState(expense.merchant ?? "");
  const [amount, setAmount] = useState(expense.amount ?? "");
  const [currency, setCurrency] = useState(expense.currency ?? "JMD");
  const [date, setDate] = useState(expense.date ?? "");
  const [categoryId, setCategoryId] = useState(expense.category_id ?? "");
  const suggestion = !expense.category_id && expense.ai_suggested_category
    ? expense.ai_suggested_category
    : null;
  const suggestedCat = suggestion
    ? categories.find((c) => c.name.toLowerCase() === suggestion.toLowerCase())
    : null;
  const [budgetId, setBudgetId] = useState(expense.bucket_id ?? "");
  const [notes, setNotes] = useState(expense.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [retrying, setRetrying] = useState(false);

  async function save(nextStatus: "confirmed" | "pending_review") {
    setSaving(true);
    const selectedCat = categories.find((c) => c.id === categoryId);
    await fetch(`/api/expenses/${expense.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant: merchant || null,
        amount: amount !== "" ? Number(amount) : null,
        currency,
        date,
        bucket_id: budgetId || null,
        confirmed_category: selectedCat?.name ?? null,
        category_id: categoryId || null,
        notes: notes || null,
        status: nextStatus,
      }),
    });
    router.refresh();
    setSaving(false);
  }

  async function retryOcr() {
    setRetrying(true);
    await fetch(`/api/expenses/${expense.id}/retry-ocr`, { method: "POST" });
    router.refresh();
    setRetrying(false);
  }

  async function discard() {
    if (!confirm("Delete this transaction?")) return;
    await fetch(`/api/expenses/${expense.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      {expense.receipt_url && (
        <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={expense.receipt_url} alt="Receipt" className="w-full max-h-52 object-cover object-top" />
        </a>
      )}

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          {expense.status === "pending_ocr" && (
            <span className="text-xs bg-amber-50 border border-amber-200 text-amber-600 px-2.5 py-0.5 rounded-full font-medium">
              OCR pending
            </span>
          )}
          {expense.status === "pending_review" && (
            <span className="text-xs bg-blue-50 border border-blue-200 text-blue-600 px-2.5 py-0.5 rounded-full font-medium">
              Needs review
            </span>
          )}
          <span className="text-xs text-gray-400 capitalize ml-auto">{expense.source}</span>
        </div>

        {!expense.receipt_url && expense.raw_ocr_text && (
          <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 italic">
            &ldquo;{expense.raw_ocr_text}&rdquo;
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelCls}>Merchant</label>
            <input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Business name" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Amount</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={selectCls}>
              {["JMD", "USD", "GBP", "EUR", "CAD"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={selectCls}
            >
              <option value="">— no category —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon ? `${c.icon} ` : ""}{c.name}
                </option>
              ))}
            </select>
            {suggestedCat && !categoryId && (
              <button
                type="button"
                onClick={() => setCategoryId(suggestedCat.id)}
                className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-500 transition-colors"
              >
                <span className="text-blue-400">✦</span>
                Suggested: <span className="font-medium">{suggestion}</span>
                <span className="text-blue-300 text-xs">— tap to accept</span>
              </button>
            )}
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Budget</label>
            <select value={budgetId} onChange={(e) => setBudgetId(e.target.value)} className={selectCls}>
              <option value="">— no budget —</option>
              {budgets.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
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

        <div className="flex gap-2 pt-1">
          {expense.status === "pending_ocr" && expense.receipt_url && (
            <button onClick={retryOcr} disabled={retrying}
              className="flex-1 rounded-xl border border-gray-300 bg-gray-50 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors">
              {retrying ? "Retrying…" : "Retry OCR"}
            </button>
          )}
          <button onClick={discard}
            className="rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors">
            Delete
          </button>
          <button onClick={() => save("confirmed")} disabled={saving}
            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2.5 text-xs font-semibold text-white transition-colors">
            {saving ? "Saving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
