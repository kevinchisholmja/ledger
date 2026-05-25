"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/app/components/LogoutButton";
import { formatCurrency } from "@/lib/format";
import type { PlanBudget, PlanGroup } from "./page";
import { BUDGET_PERIOD_DAYS } from "@/lib/period";

const AVG_MONTH_DAYS = 365.25 / 12;

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

function SidebarItem({
  href,
  icon,
  label,
  active,
  badge,
}: {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? "bg-white/15 text-white font-medium"
          : "text-slate-400 hover:text-white hover:bg-white/10"
      }`}
    >
      <span className="w-4 text-center shrink-0 text-base leading-none">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge != null && (
        <span className="ml-auto min-w-[1.25rem] h-5 rounded-full bg-blue-500 text-white text-xs font-semibold flex items-center justify-center px-1.5">
          {badge}
        </span>
      )}
    </Link>
  );
}

function AvailablePill({ value }: { value: number }) {
  if (value < 0)
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 tabular-nums">
        −{formatCurrency(Math.abs(value), "JMD")}
      </span>
    );
  if (value === 0)
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 tabular-nums">
        {formatCurrency(0, "JMD")}
      </span>
    );
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 tabular-nums">
      {formatCurrency(value, "JMD")}
    </span>
  );
}

interface EditingCell {
  budgetId: string;
  value: string;
}

export default function PlanClient({
  groups,
  yearMonth,
  monthLabel,
  totalAssigned,
  totalActivity,
  totalAvailable,
  pendingCount,
  userEmail,
}: {
  groups: PlanGroup[];
  yearMonth: string;
  monthLabel: string;
  totalAssigned: number;
  totalActivity: number;
  totalAvailable: number;
  pendingCount: number;
  userEmail: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // collapsed state per group name
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  // inline edit state
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function toggleGroup(name: string) {
    setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  function startEdit(b: PlanBudget) {
    setEditing({ budgetId: b.id, value: b.monthlyAmount.toFixed(0) });
    setTimeout(() => inputRef.current?.select(), 30);
  }

  async function commitEdit(b: PlanBudget, rawValue: string) {
    setEditing(null);
    const monthly = parseFloat(rawValue.replace(/[^0-9.]/g, ""));
    if (isNaN(monthly) || monthly < 0) return;

    const nativeDays = BUDGET_PERIOD_DAYS[b.period] ?? AVG_MONTH_DAYS;
    const newNative = monthly * (nativeDays / AVG_MONTH_DAYS);

    setSaving(b.id);
    try {
      await fetch(`/api/budgets/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: newNative.toFixed(2) }),
      });
      startTransition(() => router.refresh());
    } finally {
      setSaving(null);
    }
  }

  const isOver = totalAvailable < 0;
  const isClose = !isOver && totalAssigned > 0 && totalAvailable < totalAssigned * 0.2;
  const bannerBg = isOver ? "bg-red-600" : isClose ? "bg-blue-600" : "bg-emerald-600";
  const bannerLabel = isOver
    ? "Over budget this month"
    : isClose
    ? "Close to budget limit"
    : "Available this month";

  const totalPct =
    totalAssigned > 0 ? Math.min((totalActivity / totalAssigned) * 100, 100) : 0;

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-56 flex-col fixed inset-y-0 left-0 bg-[#1B1F3B] z-20">
        <div className="px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="font-semibold text-white tracking-tight">Ledger</span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          <SidebarItem href="/" icon="⊞" label="Dashboard" />
          <SidebarItem href="/plan" icon="◫" label="Plan" active />
          <SidebarItem href="/goals" icon="◇" label="Goals" />
          <SidebarItem href="/review" icon="✓" label="Review" badge={pendingCount > 0 ? pendingCount : undefined} />
          <SidebarItem href="/transactions" icon="≡" label="Transactions" />
          <SidebarItem href="/accounts" icon="⬡" label="All Accounts" />
          <SidebarItem href="/budgets" icon="◎" label="Budgets" />
          <SidebarItem href="/budgets?tab=categories" icon="◈" label="Categories" />
        </nav>
        <div className="px-3 pb-5 pt-3 border-t border-white/10 space-y-2">
          <p className="px-3 text-xs text-slate-500 truncate">{userEmail}</p>
          <div className="px-3"><LogoutButton /></div>
        </div>
      </aside>

      {/* ── Main area (col 2 + col 3) ───────────────────────────────────── */}
      <div className="flex-1 md:pl-56 flex min-h-screen">

        {/* ── Column 2: center ──────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col">

          {/* Mobile top bar */}
          <header className="md:hidden sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">L</span>
              </div>
              <span className="font-semibold text-gray-900 tracking-tight">Ledger</span>
            </div>
            <Link
              href="/review"
              className="relative p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <span className="text-lg">✓</span>
              {pendingCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </Link>
          </header>

          {/* Month navigator bar */}
          <div className="sticky top-0 md:top-0 z-10 bg-white border-b border-gray-200 px-4 md:px-8 py-2.5 flex items-center justify-between gap-4">
            <button
              onClick={() => router.push(`/plan?month=${prevMonth(yearMonth)}`)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-lg font-light"
            >
              ‹
            </button>
            <p className="text-sm font-semibold text-gray-900">{monthLabel}</p>
            <button
              onClick={() => router.push(`/plan?month=${nextMonth(yearMonth)}`)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-lg font-light"
            >
              ›
            </button>
          </div>

          {/* Status banner */}
          <div className={`${bannerBg} px-5 md:px-8 py-5 md:py-6 flex items-center justify-between gap-6`}>
            <div>
              <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">
                {monthLabel}
              </p>
              <p className="text-white text-3xl md:text-4xl font-bold tabular-nums leading-none">
                {isOver ? "−" : ""}
                {formatCurrency(Math.abs(totalAvailable), "JMD")}
              </p>
              <p className="text-white/80 text-sm mt-1.5">{bannerLabel}</p>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
              <p className="text-white/60 text-xs">
                <span className="font-semibold text-white">{formatCurrency(totalActivity, "JMD")}</span>
                {" "}of{" "}
                <span className="font-semibold text-white">{formatCurrency(totalAssigned, "JMD")}</span>
              </p>
              <div className="w-32 h-1.5 rounded-full bg-white/25 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white/70"
                  style={{ width: `${totalPct}%` }}
                />
              </div>
              <p className="text-white/50 text-xs">{totalPct.toFixed(0)}% used</p>
            </div>
          </div>

          {/* Table */}
          <main className="flex-1 px-0 py-0 overflow-x-auto">

            {/* Column headers */}
            <div
              className="grid items-center border-b border-gray-200 bg-gray-50 px-4 md:px-8 py-2"
              style={{ gridTemplateColumns: "1fr 130px 120px 130px" }}
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Category
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">
                Assigned
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">
                Activity
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 text-right pr-2">
                Available
              </span>
            </div>

            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <p className="text-gray-500 font-medium">No budgets yet</p>
                <p className="text-gray-400 text-sm mt-1.5">
                  Create a budget to start planning your month
                </p>
                <Link
                  href="/budgets"
                  className="inline-block mt-5 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-medium text-white transition-colors"
                >
                  Create budget
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 pb-20">
                {groups.map((group) => {
                  const isCollapsed = collapsed[group.name];
                  return (
                    <div key={group.name}>
                      {/* Group header row */}
                      <button
                        onClick={() => toggleGroup(group.name)}
                        className="w-full grid items-center px-4 md:px-8 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-200"
                        style={{ gridTemplateColumns: "1fr 130px 120px 130px" }}
                      >
                        <div className="flex items-center gap-2 min-w-0 text-left">
                          <span className="text-gray-400 text-xs leading-none transition-transform duration-150 shrink-0" style={{ display: "inline-block", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>
                            ▾
                          </span>
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 truncate">
                            {group.name}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-gray-700 tabular-nums text-right">
                          {formatCurrency(group.totalAssigned, "JMD")}
                        </span>
                        <span className="text-xs font-semibold text-gray-700 tabular-nums text-right">
                          {formatCurrency(group.totalActivity, "JMD")}
                        </span>
                        <div className="flex justify-end pr-2">
                          <AvailablePill value={group.totalAvailable} />
                        </div>
                      </button>

                      {/* Budget rows */}
                      {!isCollapsed &&
                        group.budgets.map((b) => {
                          const isEditingThis = editing?.budgetId === b.id;
                          const isSaving = saving === b.id;
                          const pct =
                            b.monthlyAmount > 0
                              ? Math.min((b.activity / b.monthlyAmount) * 100, 100)
                              : 0;

                          return (
                            <div
                              key={b.id}
                              className="grid items-center px-4 md:px-8 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
                              style={{ gridTemplateColumns: "1fr 130px 120px 130px" }}
                            >
                              {/* Name + progress */}
                              <div className="flex items-center gap-3 min-w-0 pr-4">
                                {b.icon ? (
                                  <span className="text-lg shrink-0 w-7 text-center">{b.icon}</span>
                                ) : (
                                  <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                                    <span className="text-gray-500 text-xs font-bold">
                                      {b.name[0]}
                                    </span>
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {b.name}
                                  </p>
                                  <div className="mt-1 h-1 rounded-full bg-gray-100 max-w-[120px]">
                                    <div
                                      className={`h-full rounded-full ${pct >= 100 ? "bg-red-400" : pct >= 80 ? "bg-amber-400" : "bg-blue-400"}`}
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
                                    onChange={(e) =>
                                      setEditing({ budgetId: b.id, value: e.target.value })
                                    }
                                    onBlur={() => commitEdit(b, editing!.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") commitEdit(b, editing!.value);
                                      if (e.key === "Escape") setEditing(null);
                                    }}
                                    className="w-28 rounded-lg border border-blue-400 bg-blue-50 px-2 py-1 text-sm text-right tabular-nums text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                  />
                                ) : (
                                  <button
                                    onClick={() => startEdit(b)}
                                    disabled={isSaving}
                                    className={`text-sm tabular-nums text-right px-2 py-1 rounded-lg transition-colors ${
                                      isSaving
                                        ? "text-gray-400 cursor-not-allowed"
                                        : "text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-text"
                                    }`}
                                    title="Click to edit assigned amount"
                                  >
                                    {isSaving ? "…" : formatCurrency(b.monthlyAmount, b.currency)}
                                  </button>
                                )}
                              </div>

                              {/* Activity */}
                              <span className="text-sm tabular-nums text-gray-500 text-right">
                                {b.activity > 0 ? formatCurrency(b.activity, b.currency) : "—"}
                              </span>

                              {/* Available */}
                              <div className="flex justify-end pr-2">
                                <AvailablePill value={b.available} />
                              </div>
                            </div>
                          );
                        })}

                      {/* + Add budget to group */}
                      {!isCollapsed && (
                        <div className="px-4 md:px-8 py-2 border-b border-gray-100">
                          <Link
                            href={group.category_id ? `/budgets?category=${group.category_id}` : "/budgets"}
                            className="text-xs text-blue-600 hover:text-blue-500 transition-colors"
                          >
                            + Add budget to {group.name}
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Footer totals row */}
                <div
                  className="grid items-center px-4 md:px-8 py-3 bg-gray-50 border-t-2 border-gray-200"
                  style={{ gridTemplateColumns: "1fr 130px 120px 130px" }}
                >
                  <span className="text-sm font-semibold text-gray-700">Total</span>
                  <span className="text-sm font-semibold text-gray-700 tabular-nums text-right">
                    {formatCurrency(totalAssigned, "JMD")}
                  </span>
                  <span className="text-sm font-semibold text-gray-700 tabular-nums text-right">
                    {formatCurrency(totalActivity, "JMD")}
                  </span>
                  <div className="flex justify-end pr-2">
                    <AvailablePill value={totalAvailable} />
                  </div>
                </div>

                {/* + Add*/}
                <div className="px-4 md:px-8 py-4">
                  <Link
                    href="/budgets?tab=categories"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-500 transition-colors font-medium"
                  >
                    <span className="text-lg leading-none">+</span>
                    Add Category
                  </Link>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* ── Column 3: right summary panel ─────────────────────────────── */}
        <aside className="hidden md:flex w-72 flex-col border-l border-gray-200 bg-white sticky top-0 h-screen overflow-y-auto shrink-0">
          <div className="px-5 py-5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Month Summary</h2>
            <p className="text-xs text-gray-400 mt-0.5">{monthLabel}</p>
          </div>

          <div className="flex-1 px-5 py-4 space-y-4">
            {/* Assigned vs available */}
            <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Total Assigned</span>
                <span className="font-semibold tabular-nums text-gray-900">
                  {formatCurrency(totalAssigned, "JMD")}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Total Activity</span>
                <span className="font-semibold tabular-nums text-gray-700">
                  {formatCurrency(totalActivity, "JMD")}
                </span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">Available</span>
                <AvailablePill value={totalAvailable} />
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>Budget used</span>
                <span>{totalPct.toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    totalPct >= 100
                      ? "bg-red-400"
                      : totalPct >= 80
                      ? "bg-amber-400"
                      : "bg-blue-400"
                  }`}
                  style={{ width: `${totalPct}%` }}
                />
              </div>
            </div>

            {/* Per-group breakdown */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                By Category
              </h3>
              <div className="space-y-2">
                {groups.map((g) => {
                  const gpct =
                    g.totalAssigned > 0
                      ? Math.min((g.totalActivity / g.totalAssigned) * 100, 100)
                      : 0;
                  return (
                    <div key={g.name}>
                      <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                        <span className="truncate max-w-[130px]">{g.name}</span>
                        <span className="tabular-nums text-gray-400">
                          {formatCurrency(g.totalActivity, "JMD")} / {formatCurrency(g.totalAssigned, "JMD")}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${gpct >= 100 ? "bg-red-400" : gpct >= 80 ? "bg-amber-400" : "bg-blue-400"}`}
                          style={{ width: `${gpct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Left over from last month placeholder */}
            <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Left Over
              </p>
              <p className="text-sm text-gray-500 italic">
                Coming soon — rollover from prior month
              </p>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-gray-100 space-y-2">
            <Link
              href="/budgets"
              className="flex items-center justify-between text-sm text-blue-600 hover:text-blue-500 transition-colors"
            >
              <span>Manage Budgets</span>
              <span>›</span>
            </Link>
            <Link
              href="/transactions"
              className="flex items-center justify-between text-sm text-blue-600 hover:text-blue-500 transition-colors"
            >
              <span>View Transactions</span>
              <span>›</span>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
