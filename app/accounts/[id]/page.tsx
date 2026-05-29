import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { transactions, categories, buckets, bankAccounts } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import RegisterClient, { type RegisterRow } from "@/app/register/RegisterClient";
import PageHeader from "@/app/components/PageHeader";

export default async function AccountRegisterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id: accountId } = await params;

  const [account, rows] = await Promise.all([
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
    <div className="flex min-h-screen md:pl-60">
      <div className="flex min-w-0 flex-1 flex-col">
        <PageHeader
          title={account.name}
          backHref="/accounts"
          right={
            <>
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">
                {account.type}
              </span>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {registerRows.length} txns · {clearedCount} cleared
              </span>
            </>
          }
        />

        <main className="px-4 pb-24 pt-6 md:px-6">
          <RegisterClient rows={registerRows} />
        </main>
      </div>
    </div>
  );
}
