import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { transactions, categories, buckets } from "@/lib/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { CheckCircle2 } from "lucide-react";
import ReviewCard from "./ReviewCard";
import PageHeader from "@/app/components/PageHeader";

export default async function ReviewPage() {
  const user = await requireUser();

  const [pending, userCategories, userBuckets] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(and(
        eq(transactions.user_id, user.id),
        or(eq(transactions.status, "pending_review"), eq(transactions.status, "pending_ocr"))
      ))
      .orderBy(desc(transactions.created_at)),

    db.select().from(categories).where(eq(categories.user_id, user.id)).orderBy(categories.name),

    db
      .select({ id: buckets.id, name: buckets.name })
      .from(buckets)
      .where(and(eq(buckets.user_id, user.id), eq(buckets.active, true)))
      .orderBy(buckets.name),
  ]);

  const pendingCount = pending.length;

  return (
    <div className="flex min-h-screen md:pl-60">
      <div className="flex min-w-0 flex-1 flex-col">
        <PageHeader
          title="Review"
          right={
            pendingCount > 0 ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                {pendingCount}
              </span>
            ) : undefined
          }
        />

        <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6 md:px-8">
          {pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-success/10 text-success ring-1 ring-inset ring-success/20">
                <CheckCircle2 className="size-7" />
              </div>
              <p className="font-medium">All caught up</p>
              <p className="mt-1 text-sm text-muted-foreground">No transactions waiting for review</p>
              <Link href="/" className="mt-6 text-sm font-medium text-primary transition-colors hover:opacity-80">
                Back to dashboard
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map((tx) => (
                <ReviewCard
                  key={tx.id}
                  tx={tx}
                  categories={userCategories}
                  budgets={userBuckets}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
