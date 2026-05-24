"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Bucket, Category } from "@/lib/db/schema";

const PERIODS = ["weekly", "fortnightly", "monthly", "quarterly", "annual"] as const;

interface Props {
  buckets: Bucket[];
  categories: Category[];
}

export default function BucketsClient({ buckets, categories }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("monthly");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);

  async function createBucket(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/buckets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        period,
        amount: Number(amount),
        category_id: categoryId || null,
      }),
    });
    setName("");
    setAmount("");
    setCategoryId("");
    setShowForm(false);
    setSaving(false);
    router.refresh();
  }

  async function deleteBucket(id: string) {
    if (!confirm("Delete this budget?")) return;
    await fetch(`/api/buckets/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {buckets.length === 0 && !showForm && (
        <div className="flex flex-col items-center py-12 text-center">
          <p className="text-zinc-400 text-sm">No budget buckets yet</p>
          <p className="text-zinc-500 text-xs mt-1">Create one to track spending against a limit</p>
        </div>
      )}

      {buckets.map((b) => (
        <div key={b.id} className="flex items-center justify-between rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3">
          <div>
            <p className="font-medium text-sm">{b.name}</p>
            <p className="text-xs text-zinc-400 mt-0.5 capitalize">{b.period}</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="font-semibold text-sm">
              {Number(b.amount).toLocaleString("en-JM", {
                style: "currency",
                currency: "JMD",
                maximumFractionDigits: 0,
              })}
            </p>
            <button
              onClick={() => deleteBucket(b.id)}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      ))}

      {showForm ? (
        <form
          onSubmit={createBucket}
          className="rounded-xl bg-zinc-900 border border-indigo-500/40 p-4 space-y-3"
        >
          <p className="text-sm font-semibold text-white">New budget</p>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dining out"
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as typeof period)}
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {PERIODS.map((p) => (
                  <option key={p} value={p} className="capitalize">{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Amount (JMD)</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {categories.length > 0 && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Category (optional)</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— none —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-lg border border-zinc-700 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-2 text-xs font-semibold text-white transition-colors"
            >
              {saving ? "Saving…" : "Create"}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl border border-dashed border-zinc-700 py-3 text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
        >
          + Add budget
        </button>
      )}
    </div>
  );
}
