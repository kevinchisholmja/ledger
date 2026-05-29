import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { transactions, buckets, categories } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import TransactionListClient from "@/app/components/TransactionListClient";
import PageHeader from "@/app/components/PageHeader";

export default async function TransactionsPage() {
  const user = await requireUser();

  const [allTransactions, userBuckets, userCategories] = await Promise.all([
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

    db.select({ id: buckets.id, name: buckets.name })
      .from(buckets)
      .where(eq(buckets.user_id, user.id))
      .orderBy(buckets.name),

    db.select({ id: categories.id, name: categories.name, icon: categories.icon })
      .from(categories)
      .where(eq(categories.user_id, user.id))
      .orderBy(categories.name),
  ]);

  return (
    <div className="flex min-h-screen md:pl-60">
      <div className="flex min-w-0 flex-1 flex-col">
        <PageHeader
          title="Transactions"
          right={<span className="text-xs text-muted-foreground tabular-nums">{allTransactions.length} total</span>}
        />

        <main className="px-4 pb-24 pt-4 md:px-8">
          <TransactionListClient
            transactions={allTransactions}
            budgets={userBuckets}
            categories={userCategories}
          />
        </main>
      </div>
    </div>
  );
}
