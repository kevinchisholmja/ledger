"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import type { PlanBudget, PlanGroup } from "./page";

function prevMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function AvailablePill({ value, currency = "JMD" }: { value: number; currency?: string }) {
  if (value < 0)
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/15 text-destructive tabular-nums">
        −{formatCurrency(Math.abs(value), currency)}
      </span>
    );
  if (value === 0)
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground tabular-nums">
        {formatCurrency(0, currency)}
      </span>
    );
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success/15 text-success tabular-nums">
      {formatCurrency(value, currency)}
    </span>
  );
}

interface EditingCell { budgetId: string; value: string; }

interface MoveMoney {
  fromId: string;
  toId: string;
  amount: string;
}

async function upsertAssignment(bucketId: string, month: string, amount: number) {
  await fetch("/api/budget-assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket_id: bucketId, month, amount }),
  });
}

export default function PlanClient({
  groups,
  yearMonth,
  monthLabel,
  tbb,
  tbbIncome,
  tbbAssigned,
  totalActivity,
}: {
  groups: PlanGroup[];
  yearMonth: string;
  monthLabel: string;
  tbb: number;
  tbbIncome: number;
  tbbAssigned: number;
  totalActivity: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [move, setMove] = useState<MoveMoney>({ fromId: "", toId: "", amount: "" });
  const [moveSaving, setMoveSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const allBudgets = groups.flatMap((g) => g.budgets);

  function toggleGroup(name: string) {
    setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  function startEdit(b: PlanBudget) {
    setEditing({ budgetId: b.id, value: b.assigned > 0 ? b.assigned.toFixed(0) : b.suggested.toFixed(0) });
    setTimeout(() => inputRef.current?.select(), 30);
  }

  async function commitEdit(b: PlanBudget, rawValue: string) {
    setEditing(null);
    const amount = parseFloat(rawValue.replace(/[^0-9.]/g, ""));
    if (isNaN(amount) || amount < 0) return;
    setSaving(b.id);
    try {
      await upsertAssignment(b.id, yearMonth, amount);
      startTransition(() => router.refresh());
    } finally {
      setSaving(null);
    }
  }

  async function returnToTBB(b: PlanBudget) {
    // Release the unspent available back to TBB: set assigned = activity
    const newAmount = Math.max(0, b.activity);
    setSaving(b.id);
    try {
      await upsertAssignment(b.id, yearMonth, newAmount);
      startTransition(() => router.refresh());
    } finally {
      setSaving(null);
    }
  }

  async function copyLastMonth() {
    setCopying(true);
    try {
      await fetch("/api/budget-assignments/copy-last-month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year_month: yearMonth }),
      });
      startTransition(() => router.refresh());
    } finally {
      setCopying(false);
    }
  }

  async function submitMove() {
    const amount = parseFloat(move.amount);
    if (!move.fromId || !move.toId || isNaN(amount) || amount <= 0) return;
    const fromBudget = allBudgets.find((b) => b.id === move.fromId);
    if (!fromBudget) return;

    setMoveSaving(true);
    try {
      const newFrom = Math.max(0, fromBudget.assigned - amount);
      const toBudget = allBudgets.find((b) => b.id === move.toId);
      const newTo = (toBudget?.assigned ?? 0) + amount;
      await Promise.all([
        upsertAssignment(move.fromId, yearMonth, newFrom),
        upsertAssignment(move.toId, yearMonth, newTo),
      ]);
      setShowMove(false);
      setMove({ fromId: "", toId: "", amount: "" });
      startTransition(() => router.refresh());
    } finally {
      setMoveSaving(false);
    }
  }

  const tbbPositive = tbb >= 0;
  const tbbBg = tbbPositive ? "bg-success" : "bg-destructive";

  return (
    <div className="flex min-h-screen md:pl-60">

      <div className="flex-1 flex min-h-screen">

        {/* Center column */}
        <div className="flex-1 min-w-0 flex flex-col">

          {/* Month navigator */}
          <div className="sticky top-0 z-10 bg-card border-b border-border px-4 md:px-8 py-2.5 flex items-center justify-between gap-4">
            <button
              onClick={() => router.push(`/plan?month=${prevMonth(yearMonth)}`)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-lg font-light"
            >‹</button>
            <p className="text-sm font-semibold text-foreground">{monthLabel}</p>
            <button
              onClick={() => router.push(`/plan?month=${nextMonth(yearMonth)}`)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-lg font-light"
            >›</button>
          </div>

          {/* TBB banner */}
          <div className={`${tbbBg} px-5 md:px-8 py-5 md:py-6 flex items-center justify-between gap-6`}>
            <div>
              <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">
                To Be Budgeted
              </p>
              <p className="text-white text-3xl md:text-4xl font-bold tabular-nums leading-none">
                {!tbbPositive ? "−" : ""}
                {formatCurrency(Math.abs(tbb), "JMD")}
              </p>
              <p className="text-white/80 text-sm mt-1.5">
                {tbbPositive ? "Ready to assign" : "Over-assigned — move money back to balance"}
              </p>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0 text-right">
              <p className="text-white/60 text-xs">
                Income: <span className="font-semibold text-white">{formatCurrency(tbbIncome, "JMD")}</span>
              </p>
              <p className="text-white/60 text-xs">
                Assigned: <span className="font-semibold text-white">{formatCurrency(tbbAssigned, "JMD")}</span>
              </p>
              <p className="text-white/60 text-xs">
                Spent: <span className="font-semibold text-white">{formatCurrency(totalActivity, "JMD")}</span>
              </p>
            </div>
          </div>

          {/* Action bar */}
          <div className="bg-card border-b border-border px-4 md:px-8 py-2 flex items-center gap-3">
            <button
              onClick={() => setShowMove(true)}
              className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Move money
            </button>
            <span className="text-border">·</span>
            <button
              onClick={copyLastMonth}
              disabled={copying}
              className="text-xs text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-50"
            >
              {copying ? "Copying…" : "Copy last month"}
            </button>
          </div>

          {/* Column headers */}
          <div
            className="grid items-center border-b border-border bg-muted px-4 md:px-8 py-2"
            style={{ gridTemplateColumns: "1fr 130px 120px 130px 32px" }}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Assigned</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Activity</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right pr-2">Available</span>
            <span />
          </div>

          {/* Budget table */}
          <main className="flex-1 px-0 py-0 overflow-x-auto">
            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <p className="text-muted-foreground font-medium">No budgets yet</p>
                <p className="text-muted-foreground/70 text-sm mt-1.5">Create a budget to start planning your month</p>
                <Link href="/budgets" className="inline-block mt-5 rounded-xl bg-primary hover:bg-primary/90 px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors">
                  Create budget
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border/50 pb-20">
                {groups.map((group) => {
                  const isCollapsed = collapsed[group.name];
                  return (
                    <div key={group.name}>
                      {/* Group header */}
                      <button
                        onClick={() => toggleGroup(group.name)}
                        className="w-full grid items-center px-4 md:px-8 py-2.5 bg-muted hover:bg-muted/80 transition-colors border-b border-border"
                        style={{ gridTemplateColumns: "1fr 130px 120px 130px 32px" }}
                      >
                        <div className="flex items-center gap-2 min-w-0 text-left">
                          <span className="text-muted-foreground text-xs leading-none shrink-0" style={{ display: "inline-block", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>
                            ▾
                          </span>
                          <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80 truncate">{group.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-foreground tabular-nums text-right">
                          {formatCurrency(group.totalAssigned, "JMD")}
                        </span>
                        <span className="text-xs font-semibold text-foreground tabular-nums text-right">
                          {formatCurrency(group.totalActivity, "JMD")}
                        </span>
                        <div className="flex justify-end pr-2">
                          <AvailablePill value={group.totalAvailable} />
                        </div>
                        <span />
                      </button>

                      {/* Budget rows */}
                      {!isCollapsed && group.budgets.map((b) => {
                        const isEditingThis = editing?.budgetId === b.id;
                        const isSaving = saving === b.id;
                        const pct = b.assigned > 0 ? Math.min((b.activity / b.assigned) * 100, 100) : 0;
                        const canReturn = b.available > 0;

                        return (
                          <div
                            key={b.id}
                            className="grid items-center px-4 md:px-8 py-3 hover:bg-muted/50 transition-colors border-b border-border/50"
                            style={{ gridTemplateColumns: "1fr 130px 120px 130px 32px" }}
                          >
                            {/* Name + progress */}
                            <div className="flex items-center gap-3 min-w-0 pr-4">
                              {b.icon ? (
                                <span className="text-lg shrink-0 w-7 text-center">{b.icon}</span>
                              ) : (
                                <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                                  <span className="text-muted-foreground text-xs font-bold">{b.name[0]}</span>
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground truncate">{b.name}</p>
                                <div className="mt-1 h-1 rounded-full bg-muted max-w-[120px]">
                                  <div
                                    className={`h-full rounded-full ${pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-warning" : "bg-primary"}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Assigned (inline editable) */}
                            <div className="flex justify-end">
                              {isEditingThis ? (
                                <input
                                  ref={inputRef}
                                  type="number"
                                  min="0"
                                  step="100"
                                  value={editing!.value}
                                  onChange={(e) => setEditing({ budgetId: b.id, value: e.target.value })}
                                  onBlur={() => commitEdit(b, editing!.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") commitEdit(b, editing!.value);
                                    if (e.key === "Escape") setEditing(null);
                                  }}
                                  className="w-28 rounded-lg border border-primary bg-primary/10 px-2 py-1 text-sm text-right tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                  autoFocus
                                />
                              ) : (
                                <button
                                  onClick={() => startEdit(b)}
                                  disabled={isSaving}
                                  title={b.assigned === 0 && b.suggested > 0 ? `Suggested: ${formatCurrency(b.suggested, b.currency)}` : undefined}
                                  className={`text-sm tabular-nums text-right px-2 py-1 rounded-lg transition-colors ${
                                    isSaving ? "text-muted-foreground cursor-not-allowed" : "text-foreground hover:bg-primary/10 hover:text-primary cursor-text"
                                  } ${b.assigned === 0 ? "text-muted-foreground" : ""}`}
                                >
                                  {isSaving ? "…" : formatCurrency(b.assigned, b.currency)}
                                </button>
                              )}
                            </div>

                            {/* Activity */}
                            <span className="text-sm tabular-nums text-muted-foreground text-right">
                              {b.activity > 0 ? formatCurrency(b.activity, b.currency) : "—"}
                            </span>

                            {/* Available */}
                            <div className="flex justify-end pr-2">
                              <AvailablePill value={b.available} currency={b.currency} />
                            </div>

                            {/* Return to TBB */}
                            <div className="flex justify-center">
                              {canReturn && (
                                <button
                                  onClick={() => returnToTBB(b)}
                                  disabled={isSaving}
                                  title="Return available to TBB"
                                  className="text-muted-foreground hover:text-primary disabled:opacity-30 text-xs transition-colors leading-none"
                                >
                                  ↑
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {!isCollapsed && (
                        <div className="px-4 md:px-8 py-2 border-b border-border/50">
                          <Link
                            href={group.category_id ? `/budgets?category=${group.category_id}` : "/budgets"}
                            className="text-xs text-primary hover:text-primary/80 transition-colors"
                          >
                            + Add budget to {group.name}
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Footer totals */}
                <div
                  className="grid items-center px-4 md:px-8 py-3 bg-muted border-t-2 border-border"
                  style={{ gridTemplateColumns: "1fr 130px 120px 130px 32px" }}
                >
                  <span className="text-sm font-semibold text-foreground">Total</span>
                  <span className="text-sm font-semibold text-foreground tabular-nums text-right">
                    {formatCurrency(tbbAssigned, "JMD")}
                  </span>
                  <span className="text-sm font-semibold text-foreground tabular-nums text-right">
                    {formatCurrency(totalActivity, "JMD")}
                  </span>
                  <div className="flex justify-end pr-2">
                    <AvailablePill value={tbbAssigned - totalActivity} />
                  </div>
                  <span />
                </div>

                <div className="px-4 md:px-8 py-4">
                  <Link href="/categories" className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium">
                    <span className="text-lg leading-none">+</span>
                    Add Category
                  </Link>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Right summary panel */}
        <aside className="hidden md:flex w-72 flex-col border-l border-border bg-card sticky top-0 h-screen overflow-y-auto shrink-0">
          <div className="px-5 py-5 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Month Summary</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{monthLabel}</p>
          </div>

          <div className="flex-1 px-5 py-4 space-y-4">
            <div className="rounded-xl bg-muted border border-border px-4 py-3 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Income received</span>
                <span className="font-semibold tabular-nums text-success">{formatCurrency(tbbIncome, "JMD")}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total assigned</span>
                <span className="font-semibold tabular-nums text-foreground">{formatCurrency(tbbAssigned, "JMD")}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">To Be Budgeted</span>
                <AvailablePill value={tbb} />
              </div>
            </div>

            <div className="rounded-xl bg-muted border border-border px-4 py-3 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total assigned</span>
                <span className="font-semibold tabular-nums text-foreground">{formatCurrency(tbbAssigned, "JMD")}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total activity</span>
                <span className="font-semibold tabular-nums text-foreground">{formatCurrency(totalActivity, "JMD")}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Envelope balance</span>
                <AvailablePill value={tbbAssigned - totalActivity} />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">By Category</h3>
              <div className="space-y-2">
                {groups.map((g) => {
                  const gpct = g.totalAssigned > 0 ? Math.min((g.totalActivity / g.totalAssigned) * 100, 100) : 0;
                  return (
                    <div key={g.name}>
                      <div className="flex justify-between text-xs text-foreground/80 mb-0.5">
                        <span className="truncate max-w-[130px]">{g.name}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatCurrency(g.totalActivity, "JMD")} / {formatCurrency(g.totalAssigned, "JMD")}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${gpct >= 100 ? "bg-destructive" : gpct >= 80 ? "bg-warning" : "bg-primary"}`}
                          style={{ width: `${gpct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-border space-y-2">
            <Link href="/budgets" className="flex items-center justify-between text-sm text-primary hover:text-primary/80 transition-colors">
              <span>Manage Budgets</span><span>›</span>
            </Link>
            <Link href="/transactions" className="flex items-center justify-between text-sm text-primary hover:text-primary/80 transition-colors">
              <span>View Transactions</span><span>›</span>
            </Link>
          </div>
        </aside>
      </div>

      {/* Move Money modal */}
      {showMove && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowMove(false)}
        >
          <div
            className="relative w-full md:max-w-sm bg-card rounded-t-2xl md:rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-foreground mb-4">Move Money</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">From envelope</label>
                <select
                  value={move.fromId}
                  onChange={(e) => setMove((m) => ({ ...m, fromId: e.target.value, toId: m.toId === e.target.value ? "" : m.toId }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">— select —</option>
                  {allBudgets.filter((b) => b.available > 0).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({formatCurrency(b.available, b.currency)} available)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">To envelope</label>
                <select
                  value={move.toId}
                  onChange={(e) => setMove((m) => ({ ...m, toId: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">— select —</option>
                  {allBudgets.filter((b) => b.id !== move.fromId).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={move.amount}
                  onChange={(e) => setMove((m) => ({ ...m, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowMove(false)} className="rounded-xl border border-border bg-muted px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/80 transition-colors">
                Cancel
              </button>
              <button
                onClick={submitMove}
                disabled={moveSaving || !move.fromId || !move.toId || !move.amount}
                className="flex-1 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 py-2.5 text-xs font-semibold text-primary-foreground transition-colors"
              >
                {moveSaving ? "Moving…" : "Move Money"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
