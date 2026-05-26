import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { expenses, categories, buckets } from "@/lib/db/schema";
import { eq, and, sql, asc } from "drizzle-orm";
import LogoutButton from "@/app/components/LogoutButton";
import RegisterClient, { type RegisterRow } from "./RegisterClient";

function SidebarItem({
  href, icon, label, active, badge,
}: {
  href: string; icon: string; label: string; active?: boolean; badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-white/15 text-white font-medium" : "text-slate-400 hover:text-white hover:bg-white/10"
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

export default async function RegisterPage() {
  const user = await requireUser();

  const [rows, pendingCount] = await Promise.all([
    db
      .select({
        id: expenses.id,
        merchant: expenses.merchant,
        amount: expenses.amount,
        currency: expenses.currency,
        date: expenses.date,
        status: expenses.status,
        source: expenses.source,
        notes: expenses.notes,
        receipt_url: expenses.receipt_url,
        category_name: categories.name,
        bucket_name: buckets.name,
      })
      .from(expenses)
      .leftJoin(categories, eq(expenses.category_id, categories.id))
      .leftJoin(buckets, eq(expenses.bucket_id, buckets.id))
      .where(eq(expenses.user_id, user.id))
      .orderBy(asc(expenses.date), asc(expenses.created_at)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(expenses)
      .where(and(eq(expenses.user_id, user.id), sql`status IN ('pending_review', 'pending_ocr')`))
      .then((r: { count: number }[]) => r[0]?.count ?? 0),
  ]);

  // Compute running balance (all current rows are debits — credits are $0 for now)
  let balance = 0;
  const registerRows: RegisterRow[] = rows.map((r) => {
    const debit = r.amount ? Number(r.amount) : 0;
    const credit = 0; // Phase A3+: will detect from direction column
    balance = balance - debit + credit;
    return {
      id: r.id,
      account_name: null,                  // Phase A3+: join to bank_accounts via account_id
      date: r.date,
      invoice_date: null,                  // Phase A3+: new column on transactions table
      reference_num: null,                 // Phase A3+: new column on transactions table
      merchant: r.merchant,
      category_name: r.category_name ?? null,
      bucket_name: r.bucket_name ?? null,
      notes: r.notes,
      source: r.source,
      cleared: r.status === "confirmed",   // Phase A3+: replaced by real cleared boolean
      debit: r.amount,
      credit: null,                        // Phase A3+: credit transactions
      currency: r.currency,
      running_balance: balance,
      receipt_url: r.receipt_url,
    };
  });

  const totalRows = registerRows.length;
  const confirmedRows = registerRows.filter((r) => r.cleared).length;

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
          <SidebarItem href="/goals" icon="◇" label="Goals" />
          <SidebarItem href="/review" icon="✓" label="Review" badge={pendingCount > 0 ? pendingCount : undefined} />
          <SidebarItem href="/transactions" icon="≡" label="Transactions" />
          <SidebarItem href="/register" icon="▦" label="Register" active />
          <SidebarItem href="/accounts" icon="⬡" label="All Accounts" />
          <SidebarItem href="/budgets" icon="◎" label="Budgets" />
          <SidebarItem href="/categories" icon="◈" label="Categories" />
        </nav>
        <div className="px-3 pb-5 pt-3 border-t border-white/10 space-y-2">
          <p className="px-3 text-xs text-slate-500 truncate">{user.email}</p>
          <div className="px-3"><LogoutButton /></div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 md:pl-56">

        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-700 transition-colors text-lg">‹</Link>
          <h1 className="text-base font-semibold text-gray-900">Register</h1>
        </header>

        {/* Desktop header */}
        <div className="hidden md:flex sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-3 items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Transaction Register</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {totalRows} transactions · {confirmedRows} confirmed ·{" "}
              {totalRows - confirmedRows} pending
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />
              Phase A2 — columns marked ─ activate in Phase A3
            </span>
          </div>
        </div>

        <main className="px-4 md:px-6 py-6 pb-24">
          <RegisterClient rows={registerRows} />
        </main>
      </div>
    </div>
  );
}
