import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { transactions, buckets, bankAccounts, categories } from "@/lib/db/schema";
import { eq, and, ne, isNotNull, desc, sql } from "drizzle-orm";
import { formatCurrency } from "@/lib/format";
import AccountsClient from "./AccountsClient";
import TransactionListClient from "@/app/components/TransactionListClient";
import PageHeader from "@/app/components/PageHeader";

export default async function AccountsPage() {
  const user = await requireUser();

  const [allTransactions, allBankAccounts, , totalSpent, userBuckets, userCategories] = await Promise.all([
    db.select({
      id: transactions.id,
      payee_name: transactions.payee_name,
      amount: transactions.amount,
      currency: transactions.currency,
      date: transactions.date,
      status: transactions.status,
      source: transactions.source,
      direction: transactions.direction,
      bucket_id: transactions.bucket_id,
      category_id: transactions.category_id,
      category_name: categories.name,
      notes: transactions.notes,
      receipt_url: transactions.receipt_url,
      flagged: transactions.flagged,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.category_id, categories.id))
    .where(eq(transactions.user_id, user.id))
    .orderBy(desc(transactions.date), desc(transactions.created_at)),

    db.select()
      .from(bankAccounts)
      .where(eq(bankAccounts.user_id, user.id))
      .orderBy(bankAccounts.name),

    db.select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(and(
        eq(transactions.user_id, user.id),
        sql`status IN ('pending_review', 'pending_ocr')`,
      ))
      .then((r) => r[0]?.count ?? 0),

    db.select({ total: sql<string>`COALESCE(SUM(${transactions.amount}::numeric), 0)` })
      .from(transactions)
      .where(and(
        eq(transactions.user_id, user.id),
        ne(transactions.status, "pending_ocr"),
        isNotNull(transactions.amount),
      ))
      .then((r) => Number(r[0]?.total ?? 0)),

    db.select({ id: buckets.id, name: buckets.name })
      .from(buckets)
      .where(eq(buckets.user_id, user.id)),

    db.select({ id: categories.id, name: categories.name, icon: categories.icon })
      .from(categories)
      .where(eq(categories.user_id, user.id))
      .orderBy(categories.name),
  ]);

  const confirmedCount = allTransactions.filter(
    (t) => t.status === "confirmed" || t.status === "reconciled"
  ).length;
  const pendingReview = allTransactions.filter(
    (t) => t.status === "pending_review" || t.status === "pending_ocr"
  ).length;

  return (
    <div className="flex min-h-screen md:pl-60">
      <div className="flex min-w-0 flex-1 flex-col">
        <PageHeader title="All Accounts" />

        <main className="flex-1 space-y-8 px-4 pb-24 pt-6 md:px-8 md:pb-10">
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bank Accounts
            </h2>
            <AccountsClient accounts={allBankAccounts} />
          </section>

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Transactions
              </h2>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span><span className="font-semibold text-foreground">{allTransactions.length}</span> total</span>
                <span><span className="font-semibold text-success">{confirmedCount}</span> confirmed</span>
                <span><span className="font-semibold text-primary">{pendingReview}</span> needs review</span>
                <span className="font-semibold text-foreground tabular-nums">{formatCurrency(totalSpent, "JMD")}</span>
              </div>
            </div>

            <TransactionListClient
              transactions={allTransactions}
              budgets={userBuckets}
              categories={userCategories}
            />
          </section>
        </main>
      </div>
    </div>
  );
}
