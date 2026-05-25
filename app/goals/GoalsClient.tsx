"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/app/components/LogoutButton";
import { formatCurrency } from "@/lib/format";
import type { Goal } from "@/lib/db/schema";

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthsUntil(targetDate: string): number {
  const today = new Date();
  const target = new Date(targetDate + "T00:00:00");
  const months =
    (target.getFullYear() - today.getFullYear()) * 12 +
    (target.getMonth() - today.getMonth());
  return Math.max(0, months);
}

function coveragePct(monthlyAlloc: number, months: number, targetAmt: number): number {
  if (targetAmt <= 0 || months <= 0) return 0;
  return Math.min(((monthlyAlloc * months) / targetAmt) * 100, 100);
}

function formatMonthsLabel(months: number): string {
  if (months === 0) return "Due now";
  if (months < 12) return `${months} mo`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (m === 0) return y === 1 ? "1 yr" : `${y} yrs`;
  return `${y} yr ${m} mo`;
}

function formatTargetDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-JM", { month: "short", year: "numeric" });
}

function barColor(pct: number): string {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 70) return "bg-amber-400";
  return "bg-red-500";
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface GoalWithStats extends Goal {
  months: number;
  pct: number;
  onTrack: boolean;
  shortfall: number;
  neededMonthly: number;
}

// ── SidebarItem ───────────────────────────────────────────────────────────────

function SidebarItem({ href, icon, label, active, badge }: {
  href: string; icon: string; label: string; active?: boolean; badge?: number;
}) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
      active ? "bg-white/15 text-white font-medium" : "text-slate-400 hover:text-white hover:bg-white/10"
    }`}>
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

// ── MobileNavItem ─────────────────────────────────────────────────────────────

function MobileNavItem({ href, icon, label, active, badge }: {
  href: string; icon: string; label: string; active?: boolean; badge?: boolean;
}) {
  return (
    <Link href={href} className={`flex-1 flex flex-col items-center py-2.5 text-xs gap-1 relative transition-colors ${
      active ? "text-blue-600" : "text-gray-400 hover:text-gray-700"
    }`}>
      <span className="text-lg">{icon}</span>
      {label}
      {badge && <span className="absolute top-2 left-1/2 translate-x-1 w-2 h-2 bg-blue-500 rounded-full" />}
    </Link>
  );
}

// ── SummaryRow ────────────────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-gray-500 truncate">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-gray-900 shrink-0">{value}</span>
    </div>
  );
}

// ── GoalCard ──────────────────────────────────────────────────────────────────

function GoalCard({ goal, editingId, editValue, setEditValue, onEditAllocation, onSaveAllocation, onCancelEdit, onDelete }: {
  goal: GoalWithStats;
  editingId: string | null;
  editValue: string;
  setEditValue: (v: string) => void;
  onEditAllocation: (id: string, currentValue: string) => void;
  onSaveAllocation: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
}) {
  const isEditing = editingId === goal.id;
  const alloc = Number(goal.monthly_allocation);
  const target = Number(goal.target_amount);
  const cur = goal.currency ?? "JMD";
  const projected = alloc * goal.months;

  return (
    <div className={`rounded-2xl bg-white border shadow-sm overflow-hidden transition-colors ${
      goal.onTrack ? "border-gray-200" : goal.months === 0 ? "border-gray-200" : "border-red-100"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-4 pb-3 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {goal.icon
            ? <span className="text-2xl shrink-0 leading-none">{goal.icon}</span>
            : <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <span className="text-gray-500 text-sm font-bold">{goal.name[0]}</span>
              </div>
          }
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{goal.name}</p>
            <p className="text-xs text-gray-400 mt-0.5 tabular-nums">
              {formatCurrency(target, cur)} target
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs font-semibold text-gray-600">{formatTargetDate(goal.target_date)}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            goal.months === 0
              ? "bg-gray-100 text-gray-500"
              : goal.months <= 6
              ? "bg-amber-50 text-amber-600"
              : "bg-gray-50 text-gray-500"
          }`}>
            {formatMonthsLabel(goal.months)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-400">Coverage at current rate</span>
          <span className={`text-xs font-semibold tabular-nums ${
            goal.pct >= 100 ? "text-emerald-600" : goal.pct >= 70 ? "text-amber-500" : "text-red-500"
          }`}>
            {goal.pct.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor(goal.pct)}`}
            style={{ width: `${goal.pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-gray-400 tabular-nums">
            {formatCurrency(projected, cur)} projected
          </span>
          <span className="text-xs text-gray-400 tabular-nums">
            {formatCurrency(target, cur)} needed
          </span>
        </div>
      </div>

      {/* Footer: allocation + status + delete */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-gray-400 shrink-0">Monthly:</span>
          {isEditing ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSaveAllocation(goal.id);
                  if (e.key === "Escape") onCancelEdit();
                }}
                className="w-28 rounded-lg border border-blue-400 px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
                autoFocus
              />
              <button onClick={() => onSaveAllocation(goal.id)} className="text-xs text-blue-600 hover:text-blue-500 font-medium">Save</button>
              <button onClick={onCancelEdit} className="text-xs text-gray-400 hover:text-gray-600">×</button>
            </div>
          ) : (
            <button
              onClick={() => onEditAllocation(goal.id, String(alloc))}
              className="text-sm font-semibold text-gray-900 hover:text-blue-600 tabular-nums transition-colors"
              title="Click to edit monthly allocation"
            >
              {formatCurrency(alloc, cur)}/mo
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {goal.months === 0 ? (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">Past due</span>
          ) : goal.onTrack ? (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              On track ✓
            </span>
          ) : (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
              Need +{formatCurrency(goal.shortfall, cur)}/mo
            </span>
          )}
          <button
            onClick={() => onDelete(goal.id)}
            className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
            title="Delete goal"
          >
            ×
          </button>
        </div>
      </div>

      {/* Notes */}
      {goal.notes && (
        <div className="px-5 pb-3 -mt-1">
          <p className="text-xs text-gray-400 italic">{goal.notes}</p>
        </div>
      )}
    </div>
  );
}

// ── AddGoalForm ───────────────────────────────────────────────────────────────

const inputCls = "w-full rounded-xl bg-white border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-gray-500 mb-1.5";

function AddGoalForm({ onSave, onCancel }: {
  onSave: (data: {
    name: string; icon: string; target_amount: number;
    target_date: string; monthly_allocation: number; notes: string;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [monthlyAllocation, setMonthlyAllocation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Live preview while user fills the form
  const previewMonths = targetDate ? monthsUntil(targetDate + "-01") : 0;
  const previewAlloc = Number(monthlyAllocation) || 0;
  const previewTarget = Number(targetAmount) || 0;
  const previewPct = coveragePct(previewAlloc, previewMonths, previewTarget);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      name,
      icon,
      target_amount: Number(targetAmount),
      target_date: targetDate + "-01",
      monthly_allocation: Number(monthlyAllocation),
      notes,
    });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white border border-blue-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">New Goal</h3>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Goal name</label>
          <input
            type="text"
            required
            placeholder="e.g. New Car, Vacation, Roof Repair"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Icon (emoji, optional)</label>
          <input
            type="text"
            placeholder="🚗"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Target amount (JMD)</label>
          <input
            type="number"
            required
            min={1}
            placeholder="4000000"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Target date (month &amp; year)</label>
          <input
            type="month"
            required
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Monthly allocation (JMD)</label>
          <input
            type="number"
            required
            min={0}
            placeholder="50000"
            value={monthlyAllocation}
            onChange={(e) => setMonthlyAllocation(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Notes (optional)</label>
          <input
            type="text"
            placeholder="e.g. Joint savings account"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* Live coverage preview */}
      {previewTarget > 0 && previewMonths > 0 && (
        <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500">Coverage preview</span>
            <span className={`text-xs font-semibold tabular-nums ${
              previewPct >= 100 ? "text-emerald-600" : previewPct >= 70 ? "text-amber-500" : "text-red-500"
            }`}>
              {previewPct.toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div className={`h-full rounded-full ${barColor(previewPct)}`} style={{ width: `${previewPct}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {previewAlloc > 0
              ? `${formatCurrency(previewAlloc * previewMonths, "JMD")} projected over ${formatMonthsLabel(previewMonths)}`
              : `${formatMonthsLabel(previewMonths)} away`}
            {previewPct < 100 && previewMonths > 0 && previewTarget > 0 && (
              <span className="text-red-500">
                {" · "}Need {formatCurrency(previewTarget / previewMonths, "JMD")}/mo to hit target
              </span>
            )}
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 mt-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-5 py-2.5 text-sm font-medium text-white transition-colors"
        >
          {saving ? "Saving…" : "Add Goal"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function GoalsClient({ goals: initialGoals, pendingCount, userEmail }: {
  goals: Goal[];
  pendingCount: number;
  userEmail: string;
}) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Compute stats for each goal
  const goalsWithStats: GoalWithStats[] = initialGoals.map((g) => {
    const months = monthsUntil(g.target_date);
    const alloc = Number(g.monthly_allocation);
    const target = Number(g.target_amount);
    const pct = coveragePct(alloc, months, target);
    const onTrack = pct >= 100;
    const neededMonthly = months > 0 ? target / months : target;
    const shortfall = onTrack ? 0 : Math.max(0, neededMonthly - alloc);
    return { ...g, months, pct, onTrack, shortfall, neededMonthly };
  }).sort((a, b) => {
    // Behind goals first (sorted by shortfall desc), then on-track sorted by date
    if (!a.onTrack && b.onTrack) return -1;
    if (a.onTrack && !b.onTrack) return 1;
    return a.target_date.localeCompare(b.target_date);
  });

  const totalMonthly = initialGoals.reduce((s, g) => s + Number(g.monthly_allocation), 0);
  const totalTarget = initialGoals.reduce((s, g) => s + Number(g.target_amount), 0);
  const onTrackCount = goalsWithStats.filter((g) => g.onTrack).length;
  const atRiskCount = goalsWithStats.filter((g) => !g.onTrack).length;
  const nearestGoal = [...goalsWithStats].sort((a, b) => a.target_date.localeCompare(b.target_date))[0];

  const bannerBg = goalsWithStats.length === 0
    ? "bg-blue-600"
    : atRiskCount === 0
    ? "bg-emerald-600"
    : atRiskCount === goalsWithStats.length
    ? "bg-red-600"
    : "bg-blue-600";

  async function handleAddGoal(data: {
    name: string; icon: string; target_amount: number;
    target_date: string; monthly_allocation: number; notes: string;
  }) {
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setShowAddForm(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this goal?")) return;
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleSaveAllocation(id: string) {
    const num = parseFloat(editValue);
    if (isNaN(num) || num < 0) return;
    await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthly_allocation: num }),
    });
    setEditingId(null);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">

      {/* Sidebar */}
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
          <SidebarItem href="/plan" icon="◫" label="Plan" />
          <SidebarItem href="/goals" icon="◇" label="Goals" active />
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

      {/* Content + right panel */}
      <div className="flex-1 md:pl-56 flex min-h-screen">

        {/* Center column */}
        <div className="flex-1 min-w-0 flex flex-col">

          {/* Mobile header */}
          <header className="md:hidden sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm px-4 py-3 flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-700 transition-colors text-lg">‹</Link>
            <h1 className="text-base font-semibold text-gray-900 flex-1">Goals</h1>
            <button onClick={() => setShowAddForm(true)} className="text-sm text-blue-600 font-medium hover:text-blue-500">
              + Add
            </button>
          </header>

          {/* Desktop header */}
          <div className="hidden md:flex sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-3 items-center justify-between">
            <h1 className="text-base font-semibold text-gray-900">Goals</h1>
            <button
              onClick={() => setShowAddForm(true)}
              className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              + Add goal
            </button>
          </div>

          {/* Status banner */}
          {initialGoals.length > 0 && (
            <div className={`${bannerBg} px-5 md:px-8 py-5 md:py-6 flex items-center justify-between gap-6`}>
              <div>
                <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">Monthly commitment</p>
                <p className="text-white text-3xl md:text-4xl font-bold tabular-nums leading-none">
                  {formatCurrency(totalMonthly, "JMD")}
                </p>
                <p className="text-white/80 text-sm mt-1.5">
                  {atRiskCount === 0
                    ? `All ${onTrackCount} goal${onTrackCount !== 1 ? "s" : ""} on track`
                    : `${atRiskCount} goal${atRiskCount !== 1 ? "s" : ""} at risk · ${onTrackCount} on track`
                  }
                </p>
              </div>
              <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
                <p className="text-white/60 text-xs">
                  <span className="font-semibold text-white">{initialGoals.length}</span>{" "}
                  goal{initialGoals.length !== 1 ? "s" : ""}
                </p>
                <p className="text-white/60 text-xs">
                  <span className="font-semibold text-white">{formatCurrency(totalTarget, "JMD")}</span> total target
                </p>
              </div>
            </div>
          )}

          {/* Scrollable content */}
          <main className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-10 space-y-4">

            {showAddForm && (
              <AddGoalForm onSave={handleAddGoal} onCancel={() => setShowAddForm(false)} />
            )}

            {goalsWithStats.length === 0 && !showAddForm ? (
              <div className="rounded-2xl bg-white border border-gray-200 border-dashed px-6 py-16 text-center">
                <div className="text-4xl mb-3 text-gray-300">◇</div>
                <p className="text-gray-500 font-medium">No goals yet</p>
                <p className="text-gray-400 text-sm mt-1.5 max-w-sm mx-auto">
                  Set a target amount, target date, and monthly allocation — see instantly if you&apos;re on pace
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-block mt-5 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-medium text-white transition-colors"
                >
                  Add your first goal
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {goalsWithStats.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    editingId={editingId}
                    editValue={editValue}
                    setEditValue={setEditValue}
                    onEditAllocation={(id, val) => { setEditingId(id); setEditValue(val); }}
                    onSaveAllocation={handleSaveAllocation}
                    onCancelEdit={() => setEditingId(null)}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </main>
        </div>

        {/* Right summary panel */}
        <aside className="hidden md:flex w-72 flex-col border-l border-gray-200 bg-white sticky top-0 h-screen overflow-y-auto shrink-0">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Goals — Summary</h3>
          </div>

          <div className="flex-1 p-5 space-y-6">
            {/* Aggregate stats */}
            <div className="space-y-3">
              <SummaryRow label="Monthly commitment" value={formatCurrency(totalMonthly, "JMD")} />
              <SummaryRow label="Total target" value={formatCurrency(totalTarget, "JMD")} />
              {goalsWithStats.length > 0 && (
                <div className="border-t border-gray-100 pt-3 flex items-center gap-3">
                  <span className="text-xs text-emerald-600 font-semibold">{onTrackCount} on track</span>
                  {atRiskCount > 0 && (
                    <span className="text-xs text-red-500 font-semibold">{atRiskCount} at risk</span>
                  )}
                </div>
              )}
            </div>

            {/* Next milestone */}
            {nearestGoal && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Next Milestone</p>
                <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-3">
                  <div className="flex items-center gap-2.5 mb-2">
                    {nearestGoal.icon
                      ? <span className="text-lg leading-none">{nearestGoal.icon}</span>
                      : <div className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                          <span className="text-gray-500 text-xs font-bold">{nearestGoal.name[0]}</span>
                        </div>
                    }
                    <div>
                      <p className="text-sm font-medium text-gray-900">{nearestGoal.name}</p>
                      <p className="text-xs text-gray-400">{formatTargetDate(nearestGoal.target_date)}</p>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <div className={`h-full rounded-full ${barColor(nearestGoal.pct)}`} style={{ width: `${nearestGoal.pct}%` }} />
                  </div>
                  <p className={`text-xs mt-1.5 font-medium ${nearestGoal.onTrack ? "text-emerald-600" : "text-red-500"}`}>
                    {nearestGoal.onTrack
                      ? "On track ✓"
                      : `Need +${formatCurrency(nearestGoal.shortfall, "JMD")}/mo`}
                  </p>
                </div>
              </div>
            )}

            {/* Coverage breakdown */}
            {goalsWithStats.length > 1 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Coverage</p>
                <div className="space-y-2.5">
                  {goalsWithStats.map((g) => (
                    <div key={g.id} className="flex items-center gap-3">
                      <div className="shrink-0 w-5 text-center">
                        {g.icon
                          ? <span className="text-sm leading-none">{g.icon}</span>
                          : <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center">
                              <span className="text-gray-400 text-xs">{g.name[0]}</span>
                            </div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 truncate mb-0.5">{g.name}</p>
                        <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                          <div className={`h-full rounded-full ${barColor(g.pct)}`} style={{ width: `${g.pct}%` }} />
                        </div>
                      </div>
                      <span className={`text-xs font-semibold shrink-0 tabular-nums ${
                        g.pct >= 100 ? "text-emerald-600" : g.pct >= 70 ? "text-amber-500" : "text-red-500"
                      }`}>
                        {g.pct.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-100" />

            <div className="space-y-1">
              <Link href="/" className="flex items-center justify-between py-2 px-3 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <span>Dashboard</span><span className="text-gray-400 text-xs">›</span>
              </Link>
              <Link href="/plan" className="flex items-center justify-between py-2 px-3 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <span>Monthly plan</span><span className="text-gray-400 text-xs">›</span>
              </Link>
              {pendingCount > 0 && (
                <Link href="/review" className="flex items-center justify-between py-2 px-3 rounded-xl text-sm text-blue-600 hover:bg-blue-50 transition-colors">
                  <span>{pendingCount} pending review</span><span className="text-blue-400 text-xs">›</span>
                </Link>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 border-t border-gray-200 bg-white flex md:hidden z-20">
        <MobileNavItem href="/" icon="⊞" label="Home" />
        <MobileNavItem href="/goals" icon="◇" label="Goals" active />
        <MobileNavItem href="/review" icon="✓" label="Review" badge={pendingCount > 0} />
        <MobileNavItem href="/budgets" icon="◎" label="Budgets" />
      </nav>
    </div>
  );
}
