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
  defaultGroup?: string;
}

const inputCls = "w-full rounded-xl bg-white border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const selectCls = "w-full rounded-xl bg-white border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-gray-500 mb-1.5";

export default function BudgetsClient({ budgets, categories, defaultGroup }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("budgets");

  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  // Distinct group names derived from existing budgets
  const existingGroups = [
    "Uncategorized",
    ...Array.from(new Set(budgets.map((b) => b.group_name).filter((g) => g && g !== "Uncategorized"))),
  ];

  // budget form
  const [showBudgetForm, setShowBudgetForm] = useState(defaultGroup !== undefined);
  const [bName, setBName] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [amount, setAmount] = useState("");
  const [groupName, setGroupName] = useState(defaultGroup ?? "Uncategorized");
  // "pick" = dropdown of existing groups; "new" = free text for a new group
  const [groupMode, setGroupMode] = useState<"pick" | "new">(() => {
    if (defaultGroup === undefined || defaultGroup === "") return "pick";
    return existingGroups.includes(defaultGroup) ? "pick" : "new";
  });
  const [bSaving, setBSaving] = useState(false);

  // label form
  const [showCatForm, setShowCatForm] = useState(false);
  const [cName, setCName] = useState("");
  const [cIcon, setCIcon] = useState("");
  const [cSaving, setCSaving] = useState(false);

  async function createBudget(e: React.FormEvent) {
    e.preventDefault();
    setBSaving(true);
    await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: bName,
        period,
        amount: Number(amount),
        group_name: groupName.trim() || "Uncategorized",
        category_id: selectedCategoryId || null,
      }),
    });
    setBName(""); setAmount(""); setSelectedCategoryId(""); setGroupName("Uncategorized");
    setGroupMode("pick"); setShowBudgetForm(false); setBSaving(false);
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

  async function deleteCategory(id: string) {
    if (!confirm("Delete this category?")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      tab === t
        ? "bg-blue-600 text-white"
        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
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
                <div key={b.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{b.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">
                      {b.period} · {b.group_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-semibold text-sm text-gray-900 tabular-nums">{formatJMD(b.amount)}</p>
                    <button onClick={() => deleteBudget(b.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none">
                      ×
                    </button>
                  </div>
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
                <label className={labelCls}>Group</label>
                {groupMode === "pick" ? (
                  <select
                    value={existingGroups.includes(groupName) ? groupName : existingGroups[0]}
                    onChange={(e) => {
                      if (e.target.value === "__new__") {
                        setGroupMode("new");
                        setGroupName("");
                      } else {
                        setGroupName(e.target.value);
                      }
                    }}
                    className={selectCls}
                  >
                    {existingGroups.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                    <option value="__new__">＋ New category…</option>
                  </select>
                ) : (
                  <div className="flex gap-2 items-center">
                    <input
                      autoFocus
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="e.g. Bills, Needs, Wants"
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={() => { setGroupMode("pick"); setGroupName(existingGroups[0]); }}
                      className="shrink-0 text-xs text-blue-600 hover:text-blue-500 transition-colors whitespace-nowrap"
                    >
                      Pick existing
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowBudgetForm(false); setSelectedCategoryId(""); setGroupMode("pick"); setGroupName("Uncategorized"); }}
                  className="flex-1 rounded-xl border border-gray-300 py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
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
            Categories tag individual transactions when reviewing receipts.
          </p>

          {categories.length === 0 && !showCatForm && (
            <div className="flex flex-col items-center py-10 text-center">
              <p className="text-gray-500 text-sm">No categories yet</p>
              <p className="text-gray-400 text-xs mt-1">Add categories to classify your transactions</p>
            </div>
          )}

          {categories.length > 0 && (
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    {c.icon
                      ? <span className="text-lg w-7 text-center">{c.icon}</span>
                      : <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-500 text-xs font-bold">{c.name[0]}</span>
                        </div>
                    }
                    <p className="font-medium text-sm text-gray-900">{c.name}</p>
                  </div>
                  <button onClick={() => deleteCategory(c.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none">
                    ×
                  </button>
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
                  className="flex-1 rounded-xl border border-gray-300 py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
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
