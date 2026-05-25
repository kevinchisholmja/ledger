"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/lib/db/schema";

const inputCls = "w-full rounded-xl bg-white border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-gray-500 mb-1.5";
const inlineInputCls = "rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white";

export default function CategoriesClient({ categories }: { categories: Category[] }) {
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [cName, setCName] = useState("");
  const [cIcon, setCIcon] = useState("");
  const [cSaving, setCSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [eName, setEName] = useState("");
  const [eIcon, setEIcon] = useState("");
  const [eSaving, setESaving] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCSaving(true);
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cName, icon: cIcon || null }),
    });
    setCName(""); setCIcon(""); setShowForm(false); setCSaving(false);
    router.refresh();
  }

  function startEdit(c: Category) {
    setEditingId(c.id);
    setEName(c.name);
    setEIcon(c.icon ?? "");
  }

  async function save(id: string) {
    setESaving(true);
    await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: eName, icon: eIcon || null }),
    });
    setEditingId(null); setESaving(false);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this category?")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-3 max-w-2xl">
      <p className="text-xs text-gray-400">
        Categories tag individual transactions when reviewing receipts, and group budgets in the plan view.
      </p>

      {categories.length === 0 && !showForm && (
        <div className="flex flex-col items-center py-12 text-center rounded-2xl bg-white border border-gray-200">
          <p className="text-gray-500 text-sm">No categories yet</p>
          <p className="text-gray-400 text-xs mt-1">Add categories to classify your transactions and budgets</p>
        </div>
      )}

      {categories.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
          {categories.map((c) => (
            <div key={c.id}>
              {editingId === c.id ? (
                <div className="flex items-center gap-2 px-4 py-3 bg-blue-50/40">
                  <input
                    value={eIcon}
                    onChange={(e) => setEIcon(e.target.value)}
                    placeholder="🛒"
                    className={`${inlineInputCls} w-14 text-center text-lg`}
                    maxLength={4}
                  />
                  <input
                    autoFocus
                    value={eName}
                    onChange={(e) => setEName(e.target.value)}
                    placeholder="Category name"
                    className={`${inlineInputCls} flex-1`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") save(c.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <button onClick={() => save(c.id)} disabled={eSaving}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-500 disabled:opacity-50 whitespace-nowrap">
                    {eSaving ? "…" : "Save"}
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 text-sm">Cancel</button>
                </div>
              ) : (
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
                    <button onClick={() => startEdit(c)} className="text-xs text-blue-600 hover:text-blue-500 transition-colors font-medium">Edit</button>
                    <button onClick={() => remove(c.id)} className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none">×</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <form onSubmit={create} className="rounded-2xl bg-white border border-blue-200 shadow-sm p-4 space-y-3">
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
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 rounded-xl border border-gray-300 py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={cSaving}
              className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2.5 text-xs font-semibold text-white transition-colors">
              {cSaving ? "Saving…" : "Create"}
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="w-full rounded-2xl border border-dashed border-gray-300 py-3.5 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors bg-white">
          + Add category
        </button>
      )}
    </div>
  );
}
