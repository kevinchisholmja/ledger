"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  if (pct >= 100) return "bg-success";
  if (pct >= 70) return "bg-warning";
  return "bg-destructive";
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface GoalWithStats extends Goal {
  months: number;
  pct: number;
  onTrack: boolean;
  shortfall: number;
  neededMonthly: number;
}

// ── SummaryRow ────────────────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground truncate">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-foreground shrink-0">{value}</span>
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
    <div className={`rounded-2xl bg-card border shadow-sm overflow-hidden transition-colors ${
      goal.onTrack ? "border-border" : goal.months === 0 ? "border-border" : "border-destructive/30"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-4 pb-3 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {goal.icon
            ? <span className="text-2xl shrink-0 leading-none">{goal.icon}</span>
            : <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <span className="text-muted-foreground text-sm font-bold">{goal.name[0]}</span>
              </div>
          }
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{goal.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
              {formatCurrency(target, cur)} target
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs font-semibold text-foreground/80">{formatTargetDate(goal.target_date)}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            goal.months === 0
              ? "bg-muted text-muted-foreground"
              : goal.months <= 6
              ? "bg-warning/15 text-warning"
              : "bg-muted text-muted-foreground"
          }`}>
            {formatMonthsLabel(goal.months)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">Coverage at current rate</span>
          <span className={`text-xs font-semibold tabular-nums ${
            goal.pct >= 100 ? "text-success" : goal.pct >= 70 ? "text-warning" : "text-destructive"
          }`}>
            {goal.pct.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor(goal.pct)}`}
            style={{ width: `${goal.pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatCurrency(projected, cur)} projected
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatCurrency(target, cur)} needed
          </span>
        </div>
      </div>

      {/* Footer: allocation + status + delete */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border/50 gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-muted-foreground shrink-0">Monthly:</span>
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
                className="w-28 rounded-lg border border-primary px-2 py-1 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary tabular-nums"
                autoFocus
              />
              <button onClick={() => onSaveAllocation(goal.id)} className="text-xs text-primary hover:text-primary/80 font-medium">Save</button>
              <button onClick={onCancelEdit} className="text-xs text-muted-foreground hover:text-foreground">×</button>
            </div>
          ) : (
            <button
              onClick={() => onEditAllocation(goal.id, String(alloc))}
              className="text-sm font-semibold text-foreground hover:text-primary tabular-nums transition-colors"
              title="Click to edit monthly allocation"
            >
              {formatCurrency(alloc, cur)}/mo
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {goal.months === 0 ? (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Past due</span>
          ) : goal.onTrack ? (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-success/15 text-success border border-success/30">
              On track
            </span>
          ) : (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-destructive/15 text-destructive border border-destructive/30">
              Need +{formatCurrency(goal.shortfall, cur)}/mo
            </span>
          )}
          <button
            onClick={() => onDelete(goal.id)}
            className="text-muted-foreground hover:text-destructive transition-colors text-lg leading-none"
            title="Delete goal"
          >
            ×
          </button>
        </div>
      </div>

      {/* Notes */}
      {goal.notes && (
        <div className="px-5 pb-3 -mt-1">
          <p className="text-xs text-muted-foreground italic">{goal.notes}</p>
        </div>
      )}
    </div>
  );
}

// ── AddGoalForm ───────────────────────────────────────────────────────────────

const inputCls = "w-full rounded-xl bg-background border border-border px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-muted-foreground mb-1.5";

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
    <form onSubmit={handleSubmit} className="rounded-2xl bg-card border border-primary/30 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">New Goal</h3>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
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
        <div className="mt-4 rounded-xl bg-muted border border-border px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Coverage preview</span>
            <span className={`text-xs font-semibold tabular-nums ${
              previewPct >= 100 ? "text-success" : previewPct >= 70 ? "text-warning" : "text-destructive"
            }`}>
              {previewPct.toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-border overflow-hidden">
            <div className={`h-full rounded-full ${barColor(previewPct)}`} style={{ width: `${previewPct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {previewAlloc > 0
              ? `${formatCurrency(previewAlloc * previewMonths, "JMD")} projected over ${formatMonthsLabel(previewMonths)}`
              : `${formatMonthsLabel(previewMonths)} away`}
            {previewPct < 100 && previewMonths > 0 && previewTarget > 0 && (
              <span className="text-destructive">
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
          className="rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors"
        >
          {saving ? "Saving…" : "Add Goal"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function GoalsClient({ goals: initialGoals }: {
  goals: Goal[];
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
    ? "bg-primary"
    : atRiskCount === 0
    ? "bg-success"
    : atRiskCount === goalsWithStats.length
    ? "bg-destructive"
    : "bg-primary";

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
    <div className="flex min-h-screen md:pl-60">

      {/* Content + right panel */}
      <div className="flex-1 flex min-h-screen">

        {/* Center column */}
        <div className="flex-1 min-w-0 flex flex-col">

          {/* Desktop header */}
          <div className="sticky top-0 z-10 bg-card border-b border-border px-4 md:px-8 py-3 flex items-center justify-between">
            <h1 className="text-base font-semibold text-foreground">Goals</h1>
            <button
              onClick={() => setShowAddForm(true)}
              className="rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-sm font-medium text-primary-foreground transition-colors"
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
              <div className="rounded-2xl bg-card border border-border border-dashed px-6 py-16 text-center">
                <div className="text-4xl mb-3 text-muted-foreground/50">◇</div>
                <p className="text-muted-foreground font-medium">No goals yet</p>
                <p className="text-muted-foreground/70 text-sm mt-1.5 max-w-sm mx-auto">
                  Set a target amount, target date, and monthly allocation — see instantly if you&apos;re on pace
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-block mt-5 rounded-xl bg-primary hover:bg-primary/90 px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors"
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
        <aside className="hidden md:flex w-72 flex-col border-l border-border bg-card sticky top-0 h-screen overflow-y-auto shrink-0">
          <div className="p-5 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Goals — Summary</h3>
          </div>

          <div className="flex-1 p-5 space-y-6">
            {/* Aggregate stats */}
            <div className="space-y-3">
              <SummaryRow label="Monthly commitment" value={formatCurrency(totalMonthly, "JMD")} />
              <SummaryRow label="Total target" value={formatCurrency(totalTarget, "JMD")} />
              {goalsWithStats.length > 0 && (
                <div className="border-t border-border pt-3 flex items-center gap-3">
                  <span className="text-xs text-success font-semibold">{onTrackCount} on track</span>
                  {atRiskCount > 0 && (
                    <span className="text-xs text-destructive font-semibold">{atRiskCount} at risk</span>
                  )}
                </div>
              )}
            </div>

            {/* Next milestone */}
            {nearestGoal && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Next Milestone</p>
                <div className="rounded-xl bg-muted border border-border px-3 py-3">
                  <div className="flex items-center gap-2.5 mb-2">
                    {nearestGoal.icon
                      ? <span className="text-lg leading-none">{nearestGoal.icon}</span>
                      : <div className="w-7 h-7 rounded-lg bg-border flex items-center justify-center shrink-0">
                          <span className="text-muted-foreground text-xs font-bold">{nearestGoal.name[0]}</span>
                        </div>
                    }
                    <div>
                      <p className="text-sm font-medium text-foreground">{nearestGoal.name}</p>
                      <p className="text-xs text-muted-foreground">{formatTargetDate(nearestGoal.target_date)}</p>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div className={`h-full rounded-full ${barColor(nearestGoal.pct)}`} style={{ width: `${nearestGoal.pct}%` }} />
                  </div>
                  <p className={`text-xs mt-1.5 font-medium ${nearestGoal.onTrack ? "text-success" : "text-destructive"}`}>
                    {nearestGoal.onTrack
                      ? "On track"
                      : `Need +${formatCurrency(nearestGoal.shortfall, "JMD")}/mo`}
                  </p>
                </div>
              </div>
            )}

            {/* Coverage breakdown */}
            {goalsWithStats.length > 1 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Coverage</p>
                <div className="space-y-2.5">
                  {goalsWithStats.map((g) => (
                    <div key={g.id} className="flex items-center gap-3">
                      <div className="shrink-0 w-5 text-center">
                        {g.icon
                          ? <span className="text-sm leading-none">{g.icon}</span>
                          : <div className="w-5 h-5 rounded bg-muted flex items-center justify-center">
                              <span className="text-muted-foreground text-xs">{g.name[0]}</span>
                            </div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground/80 truncate mb-0.5">{g.name}</p>
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${barColor(g.pct)}`} style={{ width: `${g.pct}%` }} />
                        </div>
                      </div>
                      <span className={`text-xs font-semibold shrink-0 tabular-nums ${
                        g.pct >= 100 ? "text-success" : g.pct >= 70 ? "text-warning" : "text-destructive"
                      }`}>
                        {g.pct.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-border" />

            <div className="space-y-1">
              <Link href="/" className="flex items-center justify-between py-2 px-3 rounded-xl text-sm text-foreground/80 hover:bg-muted transition-colors">
                <span>Dashboard</span><span className="text-muted-foreground text-xs">›</span>
              </Link>
              <Link href="/plan" className="flex items-center justify-between py-2 px-3 rounded-xl text-sm text-foreground/80 hover:bg-muted transition-colors">
                <span>Monthly plan</span><span className="text-muted-foreground text-xs">›</span>
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
