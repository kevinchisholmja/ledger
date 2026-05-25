import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { buckets, categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import BudgetsClient from "./BudgetsClient";

export default async function BudgetsPage() {
  const user = await requireUser();

  const [allBuckets, allCategories] = await Promise.all([
    db.select().from(buckets).where(eq(buckets.user_id, user.id)).orderBy(buckets.name),
    db.select().from(categories).where(eq(categories.user_id, user.id)).orderBy(categories.name),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/" className="text-zinc-400 hover:text-white">‹</Link>
          <h1 className="text-base font-semibold">Budgets</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <BudgetsClient budgets={allBuckets} categories={allCategories} />
      </main>
    </div>
  );
}
