import { requireUser } from "@/lib/auth";
import { seedPresetsIfEmpty } from "@/lib/seed";
import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import CategoriesClient from "./CategoriesClient";
import PageHeader from "@/app/components/PageHeader";

export default async function CategoriesPage() {
  const user = await requireUser();
  await seedPresetsIfEmpty(user.id);

  const allCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.user_id, user.id))
    .orderBy(categories.name);

  return (
    <div className="flex min-h-screen md:pl-60">
      <div className="flex min-w-0 flex-1 flex-col">
        <PageHeader title="Categories" />
        <main className="px-4 pb-24 pt-6 md:px-8">
          <CategoriesClient categories={allCategories} />
        </main>
      </div>
    </div>
  );
}
