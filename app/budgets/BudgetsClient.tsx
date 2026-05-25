"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Bucket, Category } from "@/lib/db/schema";
import { formatJMD } from "@/lib/format";

const PERIODS: { value: string; label: string }[] = [
  { value: "weekly",       label: "Weekly" },
  { value: "fortnightly",  label: "Fortnightly" },
  { value: "monthly",      label: "Monthly" },
  { value: "quarterly",    label: "Quarterly" },
  { value: "annual",       label: "Annual (1 year)" },
  { value: "biennial",     label: "Every 2 years" },
  { value: "triennial",    label: "Every 3 years" },
  { value: "quinquennial", label: "Every 5 years" },
  { value: "decennial",    label: "Every 10 years" },
];

interface Props {
  budgets: Bucket[];
  categories: Category[];
}

const inputCls = "w-full rounded-xl bg-white border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const selectCls = "w-full rounded-xl bg-white border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-gray-500 mb-1.5";

export default function BudgetsClient({ budgets, categories }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);

  async function createBudget(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, period, amount: Number(amount), category_id: categoryId || null }),
    });
    setName(""); setAmount(""); setCategoryId(""); setShowForm(false); setSaving(false);
    router.refresh();
  }

  async function deleteBudget(id: string) {
    if (!confirm("Delete this budget?")) return;
    await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {budgets.length === 0 && !showForm && (
        <div className="flex flex-col items-center py-12 text-center">
          <p className="text-gray-500 text-sm">No budgets yet</p>
          <p className="text-gray-400 text-xs mt-1">Create one to track spending against a limit</p>
        </div>
      )}

      {budgets.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
          {budgets.map((b) => (
            <div key={b.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
              <div>
                <p className="font-medium text-sm text-gray-900">{b.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">{b.period}</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-semibold text-sm text-gray-900 tabular-nums">{formatJMD(b.amount)}</p>
                <button
                  onClick={() => deleteBudget(b.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <form onSubmit={createBudget} className="rounded-2xl bg-white border border-blue-200 shadow-sm p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">New budget</p>

          <div>
            <label className={labelCls}>Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dining out" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Period</label>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className={selectCls}>
                {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Amount (JMD)</label>
              <input required type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className={inputCls} />
            </div>
          </div>

          {categories.length > 0 && (
            <div>
              <label className={labelCls}>Category (optional)</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={selectCls}>
                <option value="">— none —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 rounded-xl border border-gray-300 py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2.5 text-xs font-semibold text-white transition-colors">
              {saving ? "Saving…" : "Create"}
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="w-full rounded-2xl border border-dashed border-gray-300 py-3.5 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors bg-white">
          + Add budget
        </button>
      )}
    </div>
  );
}
