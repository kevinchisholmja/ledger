import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { transactions, payees } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

const DIRECTION: Record<string, string> = {
  purchase: "debit",
  income: "credit",
  refund: "credit",
  chargeback: "credit",
  bank_fee: "debit",
  interest: "credit",
  opening_balance: "credit",
};

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = await req.json();

  const {
    type, account_id, amount, currency, date,
    payee_name, category_id, bucket_id,
    invoice_date, reference_num, memo, notes,
  } = body;

  if (!type || !account_id || !amount || !date) {
    return NextResponse.json({ error: "type, account_id, amount, date required" }, { status: 400 });
  }

  const direction = DIRECTION[type];
  if (!direction) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }

  // Payee lookup or creation
  let payeeId: string | null = null;
  const trimmedPayee = payee_name?.trim();
  if (trimmedPayee) {
    const existing = await db
      .select()
      .from(payees)
      .where(and(eq(payees.user_id, user.id), eq(payees.name, trimmedPayee)))
      .limit(1);

    if (existing.length > 0) {
      payeeId = existing[0].id;
    } else {
      const [created] = await db
        .insert(payees)
        .values({ user_id: user.id, name: trimmedPayee })
        .returning();
      payeeId = created.id;
    }
  }

  const [tx] = await db
    .insert(transactions)
    .values({
      user_id: user.id,
      account_id,
      direction,
      type,
      amount: String(amount),
      currency: currency ?? "JMD",
      date,
      invoice_date: invoice_date || null,
      payee_id: payeeId,
      payee_name: trimmedPayee || null,
      category_id: category_id || null,
      bucket_id: bucket_id || null,
      reference_num: reference_num || null,
      memo: memo || null,
      notes: notes || null,
      source: "manual",
      status: "confirmed",
      cleared: true,
    })
    .returning();

  return NextResponse.json(tx, { status: 201 });
}
