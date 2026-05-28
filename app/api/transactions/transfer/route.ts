import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = await req.json();

  const { from_account_id, to_account_id, amount, currency, date, memo, reference_num } = body;

  if (!from_account_id || !to_account_id || !amount || !date) {
    return NextResponse.json(
      { error: "from_account_id, to_account_id, amount, date required" },
      { status: 400 }
    );
  }

  if (from_account_id === to_account_id) {
    return NextResponse.json({ error: "from and to accounts must differ" }, { status: 400 });
  }

  const shared = {
    user_id: user.id,
    amount: String(amount),
    currency: currency ?? "JMD",
    date,
    memo: memo || null,
    reference_num: reference_num || null,
    source: "manual",
    status: "confirmed",
    cleared: true,
  } as const;

  // Insert outgoing leg first
  const [outgoing] = await db
    .insert(transactions)
    .values({ ...shared, account_id: from_account_id, direction: "debit", type: "transfer_out" })
    .returning();

  // Insert incoming leg pointing back to outgoing
  const [incoming] = await db
    .insert(transactions)
    .values({
      ...shared,
      account_id: to_account_id,
      direction: "credit",
      type: "transfer_in",
      transfer_pair_id: outgoing.id,
    })
    .returning();

  // Link outgoing to incoming
  await db
    .update(transactions)
    .set({ transfer_pair_id: incoming.id })
    .where(eq(transactions.id, outgoing.id));

  return NextResponse.json({ outgoing, incoming }, { status: 201 });
}
