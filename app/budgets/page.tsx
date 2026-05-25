import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { buckets, categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import BudgetsClient from "./BudgetsClient";

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; newGroup?: string }>;
}) {
  const user = await requireUser();
  const { group, newGroup } = await searchParams;

  const [allBuckets, allCategories] = await Promise.all([
    db.select().from(buckets).where(eq(buckets.user_id, user.id)).orderBy(buckets.name),
    db.select().from(categories).where(eq(categories.user_id, user.id)).orderBy(categories.name),
  ]);

  // ?group=X pre-fills the group name field; ?newGroup=1 opens the form to create a new group
  const defaultGroup = group ?? (newGroup ? "" : undefined);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/" className="text-gray-400 hover:text-gray-700 transition-colors text-lg">‹</Link>
          <h1 className="text-base font-semibold text-gray-900">Budgets</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <BudgetsClient budgets={allBuckets} categories={allCategories} defaultGroup={defaultGroup} />
      </main>
    </div>
  );
}
