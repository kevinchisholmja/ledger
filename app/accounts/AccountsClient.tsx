"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BankAccount } from "@/lib/db/schema";
import { formatCurrency } from "@/lib/format";

const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit", label: "Credit Card" },
  { value: "cash", label: "Cash" },
];

const inputCls =
  "w-full rounded-xl bg-white border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const selectCls =
  "w-full rounded-xl bg-white border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-gray-500 mb-1.5";

const TYPE_ABBR: Record<string, string> = {
  checking: "CHK",
  savings: "SAV",
  credit: "CC",
  cash: "$",
};

interface EditState {
  name: string;
  type: string;
  balance: string;
  currency: string;
  account_number: string;
  notes: string;
}

function AccountRow({
  account,
  onSaved,
  onDeleted,
}: {
  account: BankAccount;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditState>({
    name: account.name,
    type: account.type,
    balance: String(account.balance),
    currency: account.currency,
    account_number: account.account_number ?? "",
    notes: account.notes ?? "",
  });

  function field(key: keyof EditState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        type: form.type,
        balance: form.balance,
        currency: form.currency,
        account_number: form.account_number || null,
        notes: form.notes || null,
      }),
    });
    setSaving(false);
    setEditing(false);
    onSaved();
  }

  async function remove() {
    if (!confirm("Remove this account?")) return;
    await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
    onDeleted();
  }

  if (editing) {
    return (
      <form onSubmit={save} className="px-4 py-3.5 space-y-3 bg-blue-50/50">
        <div>
          <label className={labelCls}>Account name</label>
          <input required value={form.name} onChange={field("name")} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Type</label>
            <select value={form.type} onChange={field("type")} className={selectCls}>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Balance</label>
            <input
              required
              type="number"
              step="100"
              value={form.balance}
              onChange={field("balance")}
              className={inputCls}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Currency</label>
            <select value={form.currency} onChange={field("currency")} className={selectCls}>
              <option value="JMD">JMD</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Account number</label>
            <input
              value={form.account_number}
              onChange={field("account_number")}
              placeholder="Optional"
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <textarea
            value={form.notes}
            onChange={field("notes")}
            rows={2}
            placeholder="Optional"
            className="w-full rounded-xl bg-white border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex-1 rounded-xl border border-gray-300 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2 text-xs font-semibold text-white transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div
      className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={() => setEditing(true)}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <span className="text-blue-600 text-xs font-bold">
            {TYPE_ABBR[account.type] ?? "?"}
          </span>
        </div>
        <div>
          <p className="font-medium text-sm text-gray-900">{account.name}</p>
          <p className="text-xs text-gray-400 capitalize mt-0.5">
            {account.type} · {account.currency}
            {account.account_number ? ` · ···${account.account_number.slice(-4)}` : ""}
          </p>
          {account.notes && (
            <p className="text-xs text-gray-400 mt-0.5 italic truncate max-w-[200px]">{account.notes}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <p
          className={`font-semibold text-sm tabular-nums ${
            account.type === "credit" ? "text-red-600" : "text-gray-900"
          }`}
        >
          {account.type === "credit" ? "−" : ""}
          {formatCurrency(Number(account.balance), account.currency)}
        </p>
        <button
          onClick={(e) => { e.stopPropagation(); remove(); }}
          className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function AccountsClient({ accounts }: { accounts: BankAccount[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("checking");
  const [balance, setBalance] = useState("");
  const [currency, setCurrency] = useState("JMD");
  const [accountNumber, setAccountNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function createAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        balance: Number(balance),
        currency,
        account_number: accountNumber || null,
        notes: notes || null,
      }),
    });
    setName(""); setBalance(""); setType("checking"); setCurrency("JMD");
    setAccountNumber(""); setNotes("");
    setShowForm(false); setSaving(false);
    router.refresh();
  }

  const totalBalance = accounts.reduce((sum, a) => {
    return a.type === "credit"
      ? sum - Number(a.balance)
      : sum + Number(a.balance);
  }, 0);

  return (
    <div className="space-y-3">
      {accounts.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Net Balance
            </span>
            <span
              className={`text-sm font-bold tabular-nums ${
                totalBalance < 0 ? "text-red-600" : "text-gray-900"
              }`}
            >
              {totalBalance < 0 ? "−" : ""}
              {formatCurrency(Math.abs(totalBalance), "JMD")}
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {accounts.map((a) => (
              <AccountRow
                key={a.id}
                account={a}
                onSaved={() => router.refresh()}
                onDeleted={() => router.refresh()}
              />
            ))}
          </div>
        </div>
      )}

      {accounts.length === 0 && !showForm && (
        <div className="flex flex-col items-center py-8 text-center">
          <p className="text-gray-500 text-sm">No accounts yet</p>
          <p className="text-gray-400 text-xs mt-1">
            Add your bank accounts to track balances
          </p>
        </div>
      )}

      {showForm ? (
        <form
          onSubmit={createAccount}
          className="rounded-2xl bg-white border border-blue-200 shadow-sm p-4 space-y-3"
        >
          <p className="text-sm font-semibold text-gray-900">Add account</p>
          <div>
            <label className={labelCls}>Account name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. NCB Savings"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={selectCls}
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Balance</label>
              <input
                required
                type="number"
                min="0"
                step="100"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={selectCls}
              >
                <option value="JMD">JMD — Jamaican Dollar</option>
                <option value="USD">USD — US Dollar</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Account number</label>
              <input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Optional"
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional"
              className="w-full rounded-xl bg-white border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-xl border border-gray-300 py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2.5 text-xs font-semibold text-white transition-colors"
            >
              {saving ? "Saving…" : "Add Account"}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-2xl border border-dashed border-gray-300 py-3.5 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors bg-white"
        >
          + Add account
        </button>
      )}
    </div>
  );
}
