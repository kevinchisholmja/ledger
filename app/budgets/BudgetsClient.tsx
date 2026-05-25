"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Bucket, Category } from "@/lib/db/schema";
import { formatJMD } from "@/lib/format";

type Tab = "budgets" | "categories";

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
  defaultTab?: Tab;
  defaultCategoryId?: string;
}

const inputCls = "w-full rounded-xl bg-white border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const selectCls = "w-full rounded-xl bg-white border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-gray-500 mb-1.5";
const inlineInputCls = "rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white";

export default function BudgetsClient({ budgets, categories, defaultTab, defaultCategoryId }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(defaultTab ?? "budgets");

  const catMap = new Map(categories.map((c) => [c.id, c]));

  // ── Budget create form ────────────────────────────────────────────────────
  const [showBudgetForm, setShowBudgetForm] = useState(defaultCategoryId !== undefined);
  const [bName, setBName] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(defaultCategoryId ?? "");
  const [bSaving, setBSaving] = useState(false);

  // ── Budget inline edit ────────────────────────────────────────────────────
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [eBName, setEBName] = useState("");
  const [ePeriod, setEPeriod] = useState("monthly");
  const [eAmount, setEAmount] = useState("");
  const [eCategoryId, setECategoryId] = useState("");
  const [eSaving, setESaving] = useState(false);

  // ── Category create form ──────────────────────────────────────────────────
  const [showCatForm, setShowCatForm] = useState(false);
  const [cName, setCName] = useState("");
  const [cIcon, setCIcon] = useState("");
  const [cSaving, setCSaving] = useState(false);

  // ── Category inline edit ──────────────────────────────────────────────────
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [eCName, setECName] = useState("");
  const [eCIcon, setECIcon] = useState("");
  const [eCatSaving, setECatSaving] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function createBudget(e: React.FormEvent) {
    e.preventDefault();
    setBSaving(true);
    await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: bName, period, amount: Number(amount), category_id: categoryId || null }),
    });
    setBName(""); setAmount(""); setCategoryId(""); setShowBudgetForm(false); setBSaving(false);
    router.refresh();
  }

  function startEditBudget(b: Bucket) {
    setEditingBudgetId(b.id);
    setEBName(b.name);
    setEPeriod(b.period);
    setEAmount(String(b.amount));
    setECategoryId(b.category_id ?? "");
  }

  async function saveBudget(id: string) {
    setESaving(true);
    await fetch(`/api/budgets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: eBName, period: ePeriod, amount: Number(eAmount), category_id: eCategoryId || null }),
    });
    setEditingBudgetId(null); setESaving(false);
    router.refresh();
  }

  async function deleteBudget(id: string) {
    if (!confirm("Delete this budget?")) return;
    await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    setCSaving(true);
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cName, icon: cIcon || null }),
    });
    setCName(""); setCIcon(""); setShowCatForm(false); setCSaving(false);
    router.refresh();
  }

  function startEditCategory(c: Category) {
    setEditingCatId(c.id);
    setECName(c.name);
    setECIcon(c.icon ?? "");
  }

  async function saveCategory(id: string) {
    setECatSaving(true);
    await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: eCName, icon: eCIcon || null }),
    });
    setEditingCatId(null); setECatSaving(false);
    router.refresh();
  }

  async function deleteCategory(id: string) {
    if (!confirm("Delete this category?")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      tab === t ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
    }`;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        <button className={tabCls("budgets")} onClick={() => setTab("budgets")}>Budgets</button>
        <button className={tabCls("categories")} onClick={() => setTab("categories")}>Categories</button>
      </div>

      {/* ── Budgets tab ── */}
      {tab === "budgets" && (
        <div className="space-y-3">
          {budgets.length === 0 && !showBudgetForm && (
            <div className="flex flex-col items-center py-12 text-center">
              <p className="text-gray-500 text-sm">No budgets yet</p>
              <p className="text-gray-400 text-xs mt-1">Create one to track spending against a limit</p>
            </div>
          )}

          {budgets.length > 0 && (
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
              {budgets.map((b) => (
                <div key={b.id}>
                  {editingBudgetId === b.id ? (
                    // ── Inline edit row ──
                    <div className="px-4 py-3 space-y-3 bg-blue-50/40">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={labelCls}>Name</label>
                          <input value={eBName} onChange={(e) => setEBName(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Category</label>
                          <select
                            value={eCategoryId}
                            onChange={(e) => setECategoryId(e.target.value)}
                            className={selectCls}
                          >
                            <option value="">— no category —</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Period</label>
                          <select value={ePeriod} onChange={(e) => setEPeriod(e.target.value)} className={selectCls}>
                            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Amount (JMD)</label>
                          <input type="number" min="0" step="100" value={eAmount} onChange={(e) => setEAmount(e.target.value)} className={inputCls} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingBudgetId(null)} className="flex-1 rounded-xl border border-gray-300 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">Cancel</button>
                        <button onClick={() => saveBudget(b.id)} disabled={eSaving} className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2 text-xs font-semibold text-white transition-colors">
                          {eSaving ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // ── Display row ──
                    <div className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="font-medium text-sm text-gray-900">{b.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 capitalize">
                          {b.period} · {catMap.get(b.category_id ?? "")?.name ?? "Uncategorized"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-sm text-gray-900 tabular-nums">{formatJMD(b.amount)}</p>
                        <button onClick={() => startEditBudget(b)} className="text-xs text-blue-600 hover:text-blue-500 transition-colors font-medium">Edit</button>
                        <button onClick={() => deleteBudget(b.id)} className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none">×</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {showBudgetForm ? (
            <form onSubmit={createBudget} className="rounded-2xl bg-white border border-blue-200 shadow-sm p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-900">New budget</p>
              <div>
                <label className={labelCls}>Name</label>
                <input required value={bName} onChange={(e) => setBName(e.target.value)} placeholder="e.g. Groceries" className={inputCls} />
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
                  <input required type="number" min="0" step="100" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={selectCls}>
                  <option value="">— no category —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowBudgetForm(false); setCategoryId(""); }}
                  className="flex-1 rounded-xl border border-gray-300 py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={bSaving}
                  className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2.5 text-xs font-semibold text-white transition-colors">
                  {bSaving ? "Saving…" : "Create"}
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowBudgetForm(true)}
              className="w-full rounded-2xl border border-dashed border-gray-300 py-3.5 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors bg-white">
              + Add budget
            </button>
          )}
        </div>
      )}

      {/* ── Categories tab ── */}
      {tab === "categories" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">
            Categories tag individual transactions when reviewing receipts, and group budgets in the plan view.
          </p>

          {categories.length === 0 && !showCatForm && (
            <div className="flex flex-col items-center py-10 text-center">
              <p className="text-gray-500 text-sm">No categories yet</p>
              <p className="text-gray-400 text-xs mt-1">Add categories to classify your transactions and budgets</p>
            </div>
          )}

          {categories.length > 0 && (
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
              {categories.map((c) => (
                <div key={c.id}>
                  {editingCatId === c.id ? (
                    // ── Inline edit ──
                    <div className="flex items-center gap-2 px-4 py-3 bg-blue-50/40">
                      <input
                        value={eCIcon}
                        onChange={(e) => setECIcon(e.target.value)}
                        placeholder="🛒"
                        className={`${inlineInputCls} w-14 text-center text-lg`}
                        maxLength={4}
                      />
                      <input
                        autoFocus
                        value={eCName}
                        onChange={(e) => setECName(e.target.value)}
                        placeholder="Category name"
                        className={`${inlineInputCls} flex-1`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveCategory(c.id);
                          if (e.key === "Escape") setEditingCatId(null);
                        }}
                      />
                      <button onClick={() => saveCategory(c.id)} disabled={eCatSaving}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-500 disabled:opacity-50 whitespace-nowrap">
                        {eCatSaving ? "…" : "Save"}
                      </button>
                      <button onClick={() => setEditingCatId(null)} className="text-gray-400 hover:text-gray-600 text-sm">Cancel</button>
                    </div>
                  ) : (
                    // ── Display row ──
                    <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        {c.icon
                          ? <span className="text-lg w-7 text-center">{c.icon}</span>
                          : <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center">
                              <span className="text-gray-500 text-xs font-bold">{c.name[0]}</span>
                            </div>
                        }
                        <p className="font-medium text-sm text-gray-900">{c.name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => startEditCategory(c)} className="text-xs text-blue-600 hover:text-blue-500 transition-colors font-medium">Edit</button>
                        <button onClick={() => deleteCategory(c.id)} className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none">×</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {showCatForm ? (
            <form onSubmit={createCategory} className="rounded-2xl bg-white border border-blue-200 shadow-sm p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-900">New category</p>
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className={labelCls}>Icon</label>
                  <input value={cIcon} onChange={(e) => setCIcon(e.target.value)} placeholder="🛒" className={inputCls + " text-center text-lg"} maxLength={4} />
                </div>
                <div className="col-span-3">
                  <label className={labelCls}>Name</label>
                  <input required value={cName} onChange={(e) => setCName(e.target.value)} placeholder="e.g. Groceries" className={inputCls} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowCatForm(false)}
                  className="flex-1 rounded-xl border border-gray-300 py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={cSaving}
                  className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2.5 text-xs font-semibold text-white transition-colors">
                  {cSaving ? "Saving…" : "Create"}
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowCatForm(true)}
              className="w-full rounded-2xl border border-dashed border-gray-300 py-3.5 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors bg-white">
              + Add category
            </button>
          )}
        </div>
      )}
    </div>
  );
}
