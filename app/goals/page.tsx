import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { goals, transactions } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import GoalsClient from "./GoalsClient";

export default async function GoalsPage() {
  const user = await requireUser();

  const [userGoals, pendingCount] = await Promise.all([
    db.select().from(goals)
      .where(eq(goals.user_id, user.id))
      .orderBy(goals.target_date),

    db.select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(and(eq(transactions.user_id, user.id), sql`status IN ('pending_review', 'pending_ocr')`))
      .then((r) => r[0]?.count ?? 0),
  ]);

  return (
    <GoalsClient
      goals={userGoals}
      pendingCount={pendingCount}
      userEmail={user.email ?? ""}
    />
  );
}
