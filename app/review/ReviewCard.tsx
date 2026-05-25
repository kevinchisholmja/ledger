"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Expense, Category } from "@/lib/db/schema";

interface BudgetOption {
  id: string;
  name: string;
}

interface Props {
  expense: Expense;
  categories: Category[];
  budgets: BudgetOption[];
}

export default function ReviewCard({ expense, categories, budgets }: Props) {
  const router = useRouter();
  const [merchant, setMerchant] = useState(expense.merchant ?? "");
  const [amount, setAmount] = useState(expense.amount ?? "");
  const [currency, setCurrency] = useState(expense.currency ?? "JMD");
  const [date, setDate] = useState(expense.date ?? "");
  const [category, setCategory] = useState(
    expense.confirmed_category ?? expense.ai_suggested_category ?? ""
  );
  const [budgetId, setBudgetId] = useState(expense.bucket_id ?? "");
  const [saving, setSaving] = useState(false);
  const [retrying, setRetrying] = useState(false);

  async function save(nextStatus: "confirmed" | "pending_review") {
    setSaving(true);

    // Resolve category_id (exact name match only — never auto-create)
    const matchedCat = categories.find(
      (c) => c.name.toLowerCase() === category.toLowerCase()
    );

    await fetch(`/api/expenses/${expense.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant: merchant || null,
        amount: amount !== "" ? Number(amount) : null,
        currency,
        date,
        bucket_id: budgetId || null,
        confirmed_category: category || null,
        category_id: matchedCat?.id ?? null,
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
    if (!confirm("Delete this expense?")) return;
    await fetch(`/api/expenses/${expense.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
      {/* Receipt image */}
      {expense.receipt_url && (
        <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={expense.receipt_url}
            alt="Receipt"
            className="w-full max-h-48 object-cover object-top"
          />
        </a>
      )}

      <div className="p-4 space-y-3">
        {/* Status badge */}
        <div className="flex items-center gap-2">
          {expense.status === "pending_ocr" && (
            <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
              OCR pending
            </span>
          )}
          <span className="text-xs text-zinc-500 capitalize">{expense.source}</span>
        </div>

        {/* Raw text (for manual entries) */}
        {!expense.receipt_url && expense.raw_ocr_text && (
          <p className="text-sm text-zinc-400 bg-zinc-800 rounded-lg px-3 py-2 italic">
            &ldquo;{expense.raw_ocr_text}&rdquo;
          </p>
        )}

        {/* Fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-zinc-400 mb-1">Merchant</label>
            <input
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Business name"
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {["JMD", "USD", "GBP", "EUR", "CAD"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— pick one —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-zinc-400 mb-1">Budget</label>
            <select
              value={budgetId}
              onChange={(e) => setBudgetId(e.target.value)}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— no budget —</option>
              {budgets.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {expense.status === "pending_ocr" && expense.receipt_url && (
            <button
              onClick={retryOcr}
              disabled={retrying}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
            >
              {retrying ? "Retrying…" : "Retry OCR"}
            </button>
          )}
          <button
            onClick={discard}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-red-400 hover:bg-zinc-700 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => save("confirmed")}
            disabled={saving}
            className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2 text-xs font-semibold text-white transition-colors"
          >
            {saving ? "Saving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
