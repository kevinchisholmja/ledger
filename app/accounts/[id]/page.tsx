import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { transactions, categories, buckets, bankAccounts } from "@/lib/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import LogoutButton from "@/app/components/LogoutButton";
import RegisterClient, { type RegisterRow } from "@/app/register/RegisterClient";

function SidebarItem({ href, icon, label, active, badge }: {
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

export default async function AccountRegisterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id: accountId } = await params;

  const [account, rows, pendingCount] = await Promise.all([
    db
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, accountId), eq(bankAccounts.user_id, user.id)))
      .limit(1)
      .then((r) => r[0] ?? null),

    db
      .select({
        id: transactions.id,
        payee_name: transactions.payee_name,
        amount: transactions.amount,
        currency: transactions.currency,
        date: transactions.date,
        invoice_date: transactions.invoice_date,
        reference_num: transactions.reference_num,
        status: transactions.status,
        source: transactions.source,
        notes: transactions.notes,
        receipt_url: transactions.receipt_url,
        cleared: transactions.cleared,
        reconciled: transactions.reconciled,
        flagged: transactions.flagged,
        direction: transactions.direction,
        account_name: bankAccounts.name,
        category_name: categories.name,
        bucket_name: buckets.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.category_id, categories.id))
      .leftJoin(buckets, eq(transactions.bucket_id, buckets.id))
      .leftJoin(bankAccounts, eq(transactions.account_id, bankAccounts.id))
      .where(and(eq(transactions.user_id, user.id), eq(transactions.account_id, accountId)))
      .orderBy(asc(transactions.date), asc(transactions.created_at)),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(and(eq(transactions.user_id, user.id), sql`status IN ('pending_review', 'pending_ocr')`))
      .then((r: { count: number }[]) => r[0]?.count ?? 0),
  ]);

  if (!account) notFound();

  let balance = 0;
  const registerRows: RegisterRow[] = rows.map((r) => {
    const isDebit = r.direction === "debit";
    const amt = r.amount ? Number(r.amount) : 0;
    const debit = isDebit ? amt : 0;
    const credit = isDebit ? 0 : amt;
    balance = balance - debit + credit;
    return {
      id: r.id,
      account_name: r.account_name ?? null,
      date: r.date,
      invoice_date: r.invoice_date ?? null,
      reference_num: r.reference_num ?? null,
      payee_name: r.payee_name ?? null,
      category_name: r.category_name ?? null,
      bucket_name: r.bucket_name ?? null,
      notes: r.notes ?? null,
      source: r.source,
      cleared: r.cleared,
      reconciled: r.reconciled,
      flagged: r.flagged,
      debit: isDebit ? r.amount : null,
      credit: isDebit ? null : r.amount,
      currency: r.currency,
      running_balance: balance,
      receipt_url: r.receipt_url ?? null,
    };
  });

  const clearedCount = registerRows.filter((r) => r.cleared).length;

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
          <SidebarItem href="/register" icon="▦" label="Register" />
          <SidebarItem href="/accounts" icon="⬡" label="All Accounts" active />
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
          <Link href="/accounts" className="text-gray-400 hover:text-gray-700 transition-colors text-lg">‹</Link>
          <h1 className="text-base font-semibold text-gray-900">{account.name}</h1>
        </header>

        {/* Desktop header */}
        <div className="hidden md:flex sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-3 items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/accounts" className="text-gray-400 hover:text-gray-700 text-sm transition-colors">
                All Accounts
              </Link>
              <span className="text-gray-300 text-sm">/</span>
              <h1 className="text-base font-semibold text-gray-900">{account.name}</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium capitalize ml-1">
                {account.type}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {registerRows.length} transactions · {clearedCount} cleared
            </p>
          </div>
        </div>

        <main className="px-4 md:px-6 py-6 pb-24">
          <RegisterClient rows={registerRows} />
        </main>
      </div>
    </div>
  );
}
