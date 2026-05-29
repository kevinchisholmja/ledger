import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { seedPresetsIfEmpty } from "@/lib/seed";
import { db } from "@/lib/db/client";
import { buckets, transactions, categories } from "@/lib/db/schema";
import { eq, and, or, ne, gte, lte, isNotNull, desc, sql } from "drizzle-orm";
import { ChevronRight, ArrowUpRight } from "lucide-react";
import PeriodSelector from "@/app/components/PeriodSelector";
import CategoryIcon from "@/app/components/CategoryIcon";
import { isValidViewPeriod, BUDGET_PERIOD_DAYS, VIEW_PERIOD_DAYS } from "@/lib/period";
import type { ViewPeriod } from "@/lib/period";
import { formatCurrency } from "@/lib/format";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDateRange(view: ViewPeriod, now: Date): { start: string; end: string; label: string } {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed
  const d = now.getDate();

  switch (view) {
    case "week": {
      const dow = now.getDay(); // 0 = Sun
      const toMon = dow === 0 ? -6 : 1 - dow;
      const mon = new Date(y, m, d + toMon);
      const sun = new Date(y, m, d + toMon + 6);
      return {
        start: toDateStr(mon),
        end: toDateStr(sun),
        label: `${mon.toLocaleDateString("en-JM", { month: "short", day: "numeric" })} – ${sun.toLocaleDateString("en-JM", { month: "short", day: "numeric", year: "numeric" })}`,
      };
    }
    case "fortnight": {
      // Anchor: 1–14 = first half, 15–end = second half
      const startDay = d <= 14 ? 1 : 15;
      const endDay = d <= 14 ? 14 : new Date(y, m + 1, 0).getDate();
      const s = new Date(y, m, startDay);
      const e = new Date(y, m, endDay);
      return {
        start: toDateStr(s),
        end: toDateStr(e),
        label: `${s.toLocaleDateString("en-JM", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-JM", { month: "short", day: "numeric", year: "numeric" })}`,
      };
    }
    case "month": {
      const s = new Date(y, m, 1);
      const e = new Date(y, m + 1, 0);
      return {
        start: toDateStr(s),
        end: toDateStr(e),
        label: s.toLocaleDateString("en-JM", { month: "long", year: "numeric" }),
      };
    }
    case "quarter": {
      const q = Math.floor(m / 3);
      const s = new Date(y, q * 3, 1);
      const e = new Date(y, q * 3 + 3, 0);
      return {
        start: toDateStr(s),
        end: toDateStr(e),
        label: `Q${q + 1} ${y}`,
      };
    }
    case "year": {
      return {
        start: `${y}-01-01`,
        end: `${y}-12-31`,
        label: String(y),
      };
    }
  }
}

// ── Display helpers ───────────────────────────────────────────────────────────

/** Maps a budget's native period to its equivalent ViewPeriod, for showNote logic. */
const NATIVE_TO_VIEW: Partial<Record<string, ViewPeriod>> = {
  weekly: "week", fortnightly: "fortnight", monthly: "month", quarterly: "quarter", annual: "year",
};

const PERIOD_LABELS: Record<string, string> = {
  weekly: "weekly", fortnightly: "fortnightly", monthly: "monthly",
  quarterly: "quarterly", annual: "annual", biennial: "every 2 yrs",
  triennial: "every 3 yrs", quinquennial: "every 5 yrs", decennial: "every 10 yrs",
};

function barColor(pct: number) {
  if (pct >= 100) return "bg-destructive";
  if (pct >= 80) return "bg-warning";
  return "bg-primary";
}

function AvailablePill({ remaining, allocated }: { remaining: number; allocated: number }) {
  const over = remaining < 0;
  const close = !over && allocated > 0 && remaining < allocated * 0.2;
  const tone = over
    ? "bg-destructive/12 text-destructive"
    : close
      ? "bg-warning/15 text-warning"
      : "bg-success/12 text-success";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${tone}`}>
      {over ? "−" : ""}{formatCurrency(Math.abs(remaining), "JMD")}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await requireUser();
  await seedPresetsIfEmpty(user.id);
  const { period: rawPeriod } = await searchParams;
  const view: ViewPeriod = isValidViewPeriod(rawPeriod) ? rawPeriod : "month";

  const now = new Date();
  const { start, end, label: periodLabel } = getDateRange(view, now);
  const dateStr = now.toLocaleDateString("en-JM", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const viewDays = VIEW_PERIOD_DAYS[view];

  const [userBuckets, spendingByBucket, totalSpentInPeriod, recentTransactions, pendingCount] = await Promise.all([
    db.select().from(buckets)
      .where(and(eq(buckets.user_id, user.id), eq(buckets.active, true)))
      .orderBy(buckets.name),

    db.select({
      bucket_id: transactions.bucket_id,
      total: sql<string>`COALESCE(SUM(${transactions.amount}::numeric), 0)`,
    })
    .from(transactions)
    .where(and(
      eq(transactions.user_id, user.id),
      gte(transactions.date, start),
      lte(transactions.date, end),
      ne(transactions.status, "pending_ocr"),
      isNotNull(transactions.bucket_id),
      isNotNull(transactions.amount),
    ))
    .groupBy(transactions.bucket_id),

    db.select({ total: sql<string>`COALESCE(SUM(${transactions.amount}::numeric), 0)` })
    .from(transactions)
    .where(and(
      eq(transactions.user_id, user.id),
      gte(transactions.date, start),
      lte(transactions.date, end),
      ne(transactions.status, "pending_ocr"),
      isNotNull(transactions.amount),
    ))
    .then((r) => Number(r[0]?.total ?? 0)),

    db.select({
      id: transactions.id,
      payee_name: transactions.payee_name,
      memo: transactions.memo,
      amount: transactions.amount,
      currency: transactions.currency,
      date: transactions.date,
      status: transactions.status,
      direction: transactions.direction,
      category_name: categories.name,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.category_id, categories.id))
    .where(eq(transactions.user_id, user.id))
    .orderBy(desc(transactions.created_at))
    .limit(8),

    db.select({ count: sql<number>`count(*)::int` }).from(transactions)
      .where(and(eq(transactions.user_id, user.id), or(eq(transactions.status, "pending_review"), eq(transactions.status, "pending_ocr"))))
      .then((r) => r[0]?.count ?? 0),
  ]);

  // Pro-rate each budget to the selected view window
  const spendMap = new Map(spendingByBucket.map((s) => [s.bucket_id!, Number(s.total)]));

  const budgetRows = userBuckets.map((b) => {
    const nativeDays = BUDGET_PERIOD_DAYS[b.period] ?? BUDGET_PERIOD_DAYS.monthly;
    const scale = viewDays / nativeDays;
    const proratedAmount = Number(b.amount) * scale;
    const spent = spendMap.get(b.id) ?? 0;
    const remaining = proratedAmount - spent;
    return { ...b, proratedAmount, spent, remaining };
  }).sort((a, b) => {
    const pctA = a.proratedAmount > 0 ? a.spent / a.proratedAmount : 0;
    const pctB = b.proratedAmount > 0 ? b.spent / b.proratedAmount : 0;
    return pctB - pctA;
  });

  const firstName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    (user.user_metadata?.name as string | undefined)?.split(" ")[0] ??
    user.email?.split("@")[0] ?? "there";

  const totalBudget = budgetRows.reduce((s, b) => s + b.proratedAmount, 0);
  const totalSpent = totalSpentInPeriod;
  const totalRemaining = totalBudget - totalSpent;
  const overallPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const isOver = totalRemaining < 0;
  const isClose = !isOver && overallPct >= 80;
  const bannerTone = isOver
    ? "from-destructive/12 to-destructive/5 ring-destructive/20"
    : isClose
      ? "from-warning/15 to-warning/5 ring-warning/25"
      : "from-primary/12 to-primary/5 ring-primary/20";
  const accentText = isOver ? "text-destructive" : isClose ? "text-warning" : "text-primary";
  const bannerLabel = isOver ? "Over budget for this period" : isClose ? "Close to budget limit" : "Available this period";

  const viewLabel =
    view === "week" ? "Weekly view" : view === "fortnight" ? "Fortnightly view" : view === "month" ? "Monthly view" : view === "quarter" ? "Quarterly view" : "Annual view";

  return (
    <div className="flex min-h-screen md:pl-60">
      {/* ── Center column ───────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur-sm md:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
              <span className="text-xs font-bold text-primary-foreground">L</span>
            </div>
            <span className="font-semibold tracking-tight">Ledger</span>
          </div>
        </header>

        {/* Period selector bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-background/80 px-5 py-3 backdrop-blur-sm md:px-8">
          <div>
            <p className="text-sm font-semibold">{periodLabel}</p>
            <p className="hidden text-xs text-muted-foreground sm:block">{viewLabel}</p>
          </div>
          <PeriodSelector current={view} />
        </div>

        {/* Scrollable main content */}
        <main className="flex-1 space-y-6 px-4 pb-24 pt-6 md:px-8 md:pb-10">
          <div>
            <h1 className="text-2xl font-bold capitalize tracking-tight text-balance">Hello, {firstName}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{dateStr}</p>
          </div>

          {/* Status hero card */}
          <div className={`flex items-center justify-between gap-6 rounded-2xl bg-gradient-to-br p-6 ring-1 ring-inset md:p-7 ${bannerTone}`}>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{periodLabel}</p>
              <p className={`mt-1.5 text-3xl font-bold leading-none tabular-nums md:text-4xl ${accentText}`}>
                {isOver ? "−" : ""}{formatCurrency(Math.abs(totalRemaining), "JMD")}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{bannerLabel}</p>
            </div>
            <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">{formatCurrency(totalSpent, "JMD")}</span>
                {" of "}
                <span className="font-semibold text-foreground tabular-nums">{formatCurrency(totalBudget, "JMD")}</span>
              </p>
              <div className="h-2 w-36 overflow-hidden rounded-full bg-border">
                <div className={`h-full rounded-full ${barColor(overallPct)}`} style={{ width: `${Math.min(overallPct, 100)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">{overallPct.toFixed(0)}% used</p>
            </div>
          </div>

          {pendingCount > 0 && (
            <Link href="/review"
              className="group flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 transition-colors hover:bg-primary/10">
              <div>
                <p className="font-semibold text-primary">
                  {pendingCount} {pendingCount === 1 ? "transaction" : "transactions"} to review
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">Tap to confirm and categorise</p>
              </div>
              <ChevronRight className="size-5 text-primary transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}

          {/* Budget list */}
          {budgetRows.length > 0 ? (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">Budgets</h2>
                <Link href="/budgets" className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:opacity-80">
                  Manage <ArrowUpRight className="size-3.5" />
                </Link>
              </div>

              <div className="mb-1 hidden px-4 md:grid" style={{ gridTemplateColumns: "1fr 110px 1fr 110px" }}>
                <span />
                <span className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Allocated</span>
                <span />
                <span className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Available</span>
              </div>

              <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                {budgetRows.map((b) => {
                  const pct = b.proratedAmount > 0 ? Math.min((b.spent / b.proratedAmount) * 100, 100) : 0;
                  const over = b.spent > b.proratedAmount;
                  const cur = b.currency ?? "JMD";
                  const nativeLabel = PERIOD_LABELS[b.period] ?? b.period;
                  const showNote = NATIVE_TO_VIEW[b.period] !== view;
                  const nativeAmt = formatCurrency(Number(b.amount), cur);

                  return (
                    <div key={b.id} className="px-4 py-3 transition-colors hover:bg-muted/50">
                      {/* Mobile */}
                      <div className="md:hidden">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                              {b.name[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{b.name}</p>
                              {showNote && <p className="text-xs text-muted-foreground">{nativeAmt} / {nativeLabel}</p>}
                            </div>
                          </div>
                          <AvailablePill remaining={b.remaining} allocated={b.proratedAmount} />
                        </div>
                        <div className="mb-1.5 h-1.5 rounded-full bg-muted">
                          <div className={`h-full rounded-full ${barColor(over ? 100 : pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                          <span>{formatCurrency(b.spent, cur)} spent</span>
                          <span>of {formatCurrency(b.proratedAmount, cur)}</span>
                        </div>
                      </div>

                      {/* Desktop */}
                      <div className="hidden items-center gap-x-4 md:grid" style={{ gridTemplateColumns: "1fr 110px 1fr 110px" }}>
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                            {b.name[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{b.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {showNote ? `${nativeAmt} / ${nativeLabel}` : <span className="capitalize">{nativeLabel}</span>}
                            </p>
                          </div>
                        </div>
                        <span className="text-right text-sm text-muted-foreground tabular-nums">
                          {formatCurrency(b.proratedAmount, cur)}
                        </span>
                        <div className="h-2 rounded-full bg-muted">
                          <div className={`h-full rounded-full ${barColor(over ? 100 : pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <div className="flex justify-end">
                          <AvailablePill remaining={b.remaining} allocated={b.proratedAmount} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <p className="font-medium">No budgets yet</p>
              <p className="mt-1.5 text-sm text-muted-foreground">Create a budget to start tracking your spending</p>
              <Link href="/budgets"
                className="mt-5 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                Create budget
              </Link>
            </div>
          )}

          {/* Recent transactions */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Recent</h2>
              <Link href="/transactions" className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:opacity-80">
                See all <ArrowUpRight className="size-3.5" />
              </Link>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
                <p className="text-sm text-muted-foreground">No transactions yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Send a receipt photo to your Telegram bot</p>
              </div>
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                {recentTransactions.map((e) => (
                  <div key={e.id} className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/50">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <CategoryIcon name={e.category_name} className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {e.payee_name ?? e.memo?.slice(0, 40) ?? "—"}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{e.date}</span>
                        {e.category_name && (
                          <>
                            <span className="opacity-50">·</span>
                            <span className="truncate">{e.category_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {e.amount != null ? (
                        <p className={`text-sm font-semibold tabular-nums ${e.direction === "credit" ? "text-success" : "text-foreground"}`}>
                          {e.direction === "credit" ? "+" : ""}{formatCurrency(Number(e.amount), e.currency)}
                        </p>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {e.status === "pending_ocr" ? "OCR pending" : "No amount"}
                        </span>
                      )}
                      {e.status === "pending_review" && (
                        <p className="mt-0.5 text-xs text-primary">Needs review</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* ── Right summary panel ─────────────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col overflow-y-auto border-l border-border bg-card lg:flex">
        <div className="border-b border-border p-5">
          <h3 className="text-sm font-semibold">{periodLabel} — Summary</h3>
        </div>

        <div className="flex-1 space-y-6 p-5">
          <div className="space-y-3">
            <SummaryRow label="Budgeted" value={formatCurrency(totalBudget, "JMD")} />
            <SummaryRow label="Activity" value={formatCurrency(totalSpent, "JMD")} />
            <div className="border-t border-border pt-3">
              <SummaryRow
                label="Available"
                value={`${isOver ? "−" : ""}${formatCurrency(Math.abs(totalRemaining), "JMD")}`}
                color={isOver ? "text-destructive" : "text-success"}
                bold
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Budget Health</p>
              <span className={`text-xs font-semibold tabular-nums ${isOver ? "text-destructive" : isClose ? "text-warning" : "text-success"}`}>
                {overallPct.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full ${barColor(overallPct)}`} style={{ width: `${Math.min(overallPct, 100)}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {budgetRows.length} {budgetRows.length === 1 ? "budget" : "budgets"} · {view} view
            </p>
          </div>

          <div className="border-t border-border" />

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upcoming / Targets</p>
            <p className="text-sm italic text-muted-foreground">Coming soon</p>
          </div>

          <div className="space-y-1 border-t border-border pt-4">
            <SummaryLink href="/budgets" label="Manage budgets" />
            <SummaryLink href="/transactions" label="All transactions" />
            {pendingCount > 0 && (
              <Link href="/review"
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-primary transition-colors hover:bg-primary/10">
                <span>{pendingCount} pending review</span>
                <ChevronRight className="size-4" />
              </Link>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryRow({ label, value, bold, color }: {
  label: string; value: string; bold?: boolean; color?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="truncate text-sm text-muted-foreground">{label}</span>
      <span className={`shrink-0 text-sm tabular-nums ${bold ? "font-bold" : "font-semibold"} ${color ?? "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

function SummaryLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href}
      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
      <span>{label}</span>
      <ChevronRight className="size-4 opacity-60" />
    </Link>
  );
}
