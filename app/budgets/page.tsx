import { requireUser } from "@/lib/auth";
import { seedPresetsIfEmpty } from "@/lib/seed";
import { db } from "@/lib/db/client";
import { buckets, categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import BudgetsClient from "./BudgetsClient";
import PageHeader from "@/app/components/PageHeader";

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const user = await requireUser();
  await seedPresetsIfEmpty(user.id);
  const { category } = await searchParams;

  const [allBuckets, allCategories] = await Promise.all([
    db.select().from(buckets).where(eq(buckets.user_id, user.id)).orderBy(buckets.name),
    db.select().from(categories).where(eq(categories.user_id, user.id)).orderBy(categories.name),
  ]);

  return (
    <div className="flex min-h-screen md:pl-60">
      <div className="flex min-w-0 flex-1 flex-col">
        <PageHeader title="Budgets" />
        <main className="px-4 pb-24 pt-6 md:px-8">
          <BudgetsClient budgets={allBuckets} categories={allCategories} defaultCategoryId={category} />
        </main>
      </div>
    </div>
  );
}
