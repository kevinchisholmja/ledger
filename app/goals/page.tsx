import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { goals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import GoalsClient from "./GoalsClient";

export default async function GoalsPage() {
  const user = await requireUser();

  const userGoals = await db.select().from(goals)
    .where(eq(goals.user_id, user.id))
    .orderBy(goals.target_date);

  return (
    <GoalsClient goals={userGoals} />
  );
}
