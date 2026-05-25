import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { expenses, categories, buckets } from "@/lib/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import ReviewCard from "./ReviewCard";

export default async function ReviewPage() {
  const user = await requireUser();

  const [pending, userCategories, userBuckets] = await Promise.all([
    db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.user_id, user.id),
          or(eq(expenses.status, "pending_review"), eq(expenses.status, "pending_ocr"))
        )
      )
      .orderBy(desc(expenses.created_at)),

    db.select().from(categories).where(eq(categories.user_id, user.id)).orderBy(categories.name),

    db
      .select({ id: buckets.id, name: buckets.name })
      .from(buckets)
      .where(and(eq(buckets.user_id, user.id), eq(buckets.active, true)))
      .orderBy(buckets.name),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/" className="text-gray-400 hover:text-gray-700 transition-colors text-lg">‹</Link>
          <h1 className="text-base font-semibold text-gray-900">Review</h1>
          {pending.length > 0 && (
            <span className="ml-auto text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
              {pending.length}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✓</span>
            </div>
            <p className="text-gray-900 font-medium">All caught up</p>
            <p className="text-sm text-gray-400 mt-1">No transactions waiting for review</p>
            <Link href="/" className="mt-6 text-sm text-blue-600 hover:text-blue-500 transition-colors">
              Back to dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((expense) => (
              <ReviewCard
                key={expense.id}
                expense={expense}
                categories={userCategories}
                budgets={userBuckets}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
