import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { expenses, categories } from "@/lib/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import ReviewCard from "./ReviewCard";

export default async function ReviewPage() {
  const user = await requireUser();

  const [pending, userCategories] = await Promise.all([
    db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.user_id, user.id),
          or(
            eq(expenses.status, "pending_review"),
            eq(expenses.status, "pending_ocr")
          )
        )
      )
      .orderBy(desc(expenses.created_at)),

    db
      .select()
      .from(categories)
      .where(eq(categories.user_id, user.id))
      .orderBy(categories.name),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/" className="text-zinc-400 hover:text-white">‹</Link>
          <h1 className="text-base font-semibold">Review</h1>
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
            <p className="text-3xl mb-3">✓</p>
            <p className="text-white font-medium">All caught up</p>
            <p className="text-sm text-zinc-400 mt-1">No expenses waiting for review</p>
            <Link href="/" className="mt-6 text-sm text-blue-400 hover:text-blue-300">
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
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
