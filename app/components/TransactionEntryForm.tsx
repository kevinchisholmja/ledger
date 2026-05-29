"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type TxType =
  | "purchase"
  | "income"
  | "transfer_out"
  | "refund"
  | "bank_fee"
  | "interest"
  | "chargeback"
  | "opening_balance";

interface AccountOption { id: string; name: string; currency: string; }
interface CategoryOption { id: string; name: string; icon: string | null; type: string; }
interface BudgetOption { id: string; name: string; }
interface PayeeOption { id: string; name: string; default_category_id: string | null; default_bucket_id: string | null; }

const TYPE_LABELS: Record<TxType, string> = {
  purchase: "Purchase",
  income: "Income",
  transfer_out: "Transfer",
  refund: "Refund",
  bank_fee: "Bank Fee",
  interest: "Interest Earned",
  chargeback: "Chargeback",
  opening_balance: "Opening Balance",
};

// Which category.type to filter by for each transaction type (null = no category field)
const CAT_FILTER: Partial<Record<TxType, "expense" | "income">> = {
  purchase: "expense",
  refund: "expense",
  chargeback: "expense",
  income: "income",
};

const SHOW_BUDGET: Record<TxType, boolean> = {
  purchase: true, income: false, transfer_out: false, refund: true,
  bank_fee: false, interest: false, chargeback: false, opening_balance: false,
};

const SHOW_PAYEE: Record<TxType, boolean> = {
  purchase: true, income: true, transfer_out: false, refund: true,
  bank_fee: false, interest: false, chargeback: true, opening_balance: false,
};

const SHOW_INVOICE_DATE: Record<TxType, boolean> = {
  purchase: true, income: true, transfer_out: false, refund: false,
  bank_fee: false, interest: false, chargeback: false, opening_balance: false,
};

const SHOW_REF: Record<TxType, boolean> = {
  purchase: true, income: true, transfer_out: true, refund: true,
  bank_fee: false, interest: false, chargeback: true, opening_balance: false,
};

const inputCls = "w-full rounded-xl bg-white border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const selectCls = "w-full rounded-xl bg-white border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-gray-500 mb-1.5";
const optionalTag = <span className="text-gray-400 font-normal ml-1">(optional)</span>;

const today = () => new Date().toISOString().split("T")[0];

export default function TransactionEntryForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  const [type, setType] = useState<TxType>("purchase");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("JMD");
  const [date, setDate] = useState(today());
  const [invoiceDate, setInvoiceDate] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [budgetId, setBudgetId] = useState("");
  const [referenceNum, setReferenceNum] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryOption[]>([]);
  const [budgets, setBudgets] = useState<BudgetOption[]>([]);
  const [payees, setPayees] = useState<PayeeOption[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/budgets").then((r) => r.json()),
      fetch("/api/payees").then((r) => r.json()),
    ]).then(([accts, cats, budgs, pays]) => {
      setAccounts(accts);
      setAllCategories(cats);
      setBudgets(budgs);
      setPayees(pays);
      if (accts.length > 0) {
        setAccountId(accts[0].id);
        setCurrency(accts[0].currency);
      }
    });
  }, []);

  // Auto-fill category/budget when payee name matches an existing payee
  useEffect(() => {
    const match = payees.find(
      (p) => p.name.toLowerCase() === payeeName.trim().toLowerCase()
    );
    if (match) {
      if (match.default_category_id) setCategoryId(match.default_category_id);
      if (match.default_bucket_id) setBudgetId(match.default_bucket_id);
    }
  }, [payeeName, payees]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function handleTypeChange(next: TxType) {
    setType(next);
    setCategoryId("");
    setBudgetId("");
  }

  function handleAccountChange(id: string) {
    setAccountId(id);
    const acct = accounts.find((a) => a.id === id);
    if (acct) setCurrency(acct.currency);
  }

  const isTransfer = type === "transfer_out";
  const catFilter = CAT_FILTER[type];
  const filteredCategories = catFilter
    ? allCategories.filter((c) => c.type === catFilter)
    : [];
  const showCategory = catFilter !== undefined;

  async function submit() {
    setError("");

    if (!accountId) { setError("Select an account"); return; }
    if (!amount || Number(amount) <= 0) { setError("Enter a valid amount"); return; }
    if (!date) { setError("Select a date"); return; }
    if (isTransfer && !toAccountId) { setError("Select a destination account"); return; }

    setSaving(true);
    try {
      const endpoint = isTransfer ? "/api/transactions/transfer" : "/api/transactions";
      const body = isTransfer
        ? {
            from_account_id: accountId,
            to_account_id: toAccountId,
            amount: Number(amount),
            currency,
            date,
            memo: memo || null,
            reference_num: referenceNum || null,
          }
        : {
            type,
            account_id: accountId,
            amount: Number(amount),
            currency,
            date,
            invoice_date: invoiceDate || null,
            payee_name: payeeName || null,
            category_id: categoryId || null,
            bucket_id: budgetId || null,
            reference_num: referenceNum || null,
            memo: memo || null,
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }

      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const isDesktop = useMediaQuery("(min-width: 768px)");

  const formFields = (
    <>
      {/* Type */}
      <div>
        <label className={labelCls}>Type</label>
        <select
          value={type}
          onChange={(e) => handleTypeChange(e.target.value as TxType)}
          className={selectCls}
        >
          {(Object.entries(TYPE_LABELS) as [TxType, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* Account(s) */}
      <div className={isTransfer ? "grid grid-cols-2 gap-3" : undefined}>
        <div>
          <label className={labelCls}>{isTransfer ? "From Account" : "Account"}</label>
          <select
            value={accountId}
            onChange={(e) => handleAccountChange(e.target.value)}
            className={selectCls}
          >
            <option value="">— select —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        {isTransfer && (
          <div>
            <label className={labelCls}>To Account</label>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className={selectCls}
            >
              <option value="">— select —</option>
              {accounts
                .filter((a) => a.id !== accountId)
                .map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* Amount + Currency */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Amount</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={selectCls}
          >
            {["JMD", "USD", "GBP", "EUR", "CAD"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Date(s) */}
      <div className={SHOW_INVOICE_DATE[type] ? "grid grid-cols-2 gap-3" : undefined}>
        <div>
          <label className={labelCls}>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
          />
        </div>
        {SHOW_INVOICE_DATE[type] && (
          <div>
            <label className={labelCls}>Invoice Date{optionalTag}</label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className={inputCls}
            />
          </div>
        )}
      </div>

      {/* Payee */}
      {SHOW_PAYEE[type] && (
        <div>
          <label className={labelCls}>Payee</label>
          <input
            list="payee-suggestions"
            value={payeeName}
            onChange={(e) => setPayeeName(e.target.value)}
            placeholder="Business or person name"
            className={inputCls}
            autoComplete="off"
          />
          <datalist id="payee-suggestions">
            {payees.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
        </div>
      )}

      {/* Category */}
      {showCategory && (
        <div>
          <label className={labelCls}>Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={selectCls}
          >
            <option value="">— no category —</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon ? `${c.icon} ` : ""}{c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Budget */}
      {SHOW_BUDGET[type] && (
        <div>
          <label className={labelCls}>Budget</label>
          <select
            value={budgetId}
            onChange={(e) => setBudgetId(e.target.value)}
            className={selectCls}
          >
            <option value="">— no budget —</option>
            {budgets.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Ref # */}
      {SHOW_REF[type] && (
        <div>
          <label className={labelCls}>Ref #{optionalTag}</label>
          <input
            value={referenceNum}
            onChange={(e) => setReferenceNum(e.target.value)}
            placeholder="Check #, invoice #, wire ref…"
            className={inputCls}
          />
        </div>
      )}

      {/* Memo */}
      <div>
        <label className={labelCls}>Memo{optionalTag}</label>
        <input
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="Brief description…"
          className={inputCls}
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
      )}
    </>
  );

  const formActions = (
    <>
      <button
        onClick={onClose}
        className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={submit}
        disabled={saving}
        className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2.5 text-xs font-semibold text-white transition-colors"
      >
        {saving ? "Saving…" : isTransfer ? "Add Transfer" : "Add Transaction"}
      </button>
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] pr-1 space-y-4 py-1">
            {formFields}
          </div>
          <div className="flex gap-2 justify-end pt-3">
            {formActions}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left px-5 pb-2">
          <DrawerTitle>Add Transaction</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-5 py-4 space-y-4 pb-12">
          {formFields}
          <div className="flex gap-2 pt-2">
            {formActions}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
