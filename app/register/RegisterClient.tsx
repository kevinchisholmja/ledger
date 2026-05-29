"use client";

import { useState, useTransition, Fragment } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/format";

export interface RegisterRow {
  id: string;
  account_name: string | null;
  date: string;
  invoice_date: string | null;
  reference_num: string | null;
  payee_name: string | null;
  category_name: string | null;
  bucket_name: string | null;
  notes: string | null;
  source: string;
  cleared: boolean;
  reconciled: boolean;
  flagged: boolean;
  debit: string | null;
  credit: string | null;
  currency: string;
  running_balance: number;
  receipt_url: string | null;
}

const SOURCE_LABEL: Record<string, string> = {
  telegram: "TG",
  shortcut: "iOS",
  manual: "Web",
  csv: "CSV",
};

const TH_BASE = "px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 bg-gray-50 select-none cursor-pointer hover:bg-gray-100 hover:text-gray-700 transition";
const TD = "px-3 py-2.5 text-xs text-gray-700 whitespace-nowrap align-middle";
const TD_NUM = "px-3 py-2.5 text-xs font-mono text-right whitespace-nowrap align-middle";
const PLACEHOLDER = "text-gray-300 text-xs italic";

async function patchTransaction(id: string, patch: Record<string, unknown>) {
  await fetch(`/api/transactions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export default function RegisterClient({ rows }: { rows: RegisterRow[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [patching, setPatching] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAccount, setFilterAccount] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterBudget, setFilterBudget] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Sorting States
  const [sortBy, setSortBy] = useState<keyof RegisterRow | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  async function toggle(id: string, field: "flagged" | "cleared" | "reconciled", current: boolean) {
    setPatching(`${id}-${field}`);
    await patchTransaction(id, { [field]: !current });
    setPatching(null);
    startTransition(() => router.refresh());
  }

  const toggleSort = (field: keyof RegisterRow | "amount") => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // Extract unique accounts, categories, and budgets from the rows for filter lists
  const uniqueAccounts = Array.from(new Set(rows.map((r) => r.account_name).filter(Boolean))) as string[];
  const uniqueCategories = Array.from(new Set(rows.map((r) => r.category_name).filter(Boolean))) as string[];
  const uniqueBudgets = Array.from(new Set(rows.map((r) => r.bucket_name).filter(Boolean))) as string[];

  // 1. Filter rows
  const filteredRows = rows.filter((row) => {
    if (filterAccount && row.account_name !== filterAccount) return false;
    if (filterCategory && row.category_name !== filterCategory) return false;
    if (filterBudget && row.bucket_name !== filterBudget) return false;

    if (filterStatus === "cleared" && !row.cleared) return false;
    if (filterStatus === "reconciled" && !row.reconciled) return false;
    if (filterStatus === "uncleared" && row.cleared) return false;
    if (filterStatus === "flagged" && !row.flagged) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchPayee = row.payee_name?.toLowerCase().includes(q);
      const matchNotes = row.notes?.toLowerCase().includes(q);
      const matchRef = row.reference_num?.toLowerCase().includes(q);
      const matchAccount = row.account_name?.toLowerCase().includes(q);
      if (!matchPayee && !matchNotes && !matchRef && !matchAccount) return false;
    }

    return true;
  });

  // 2. Sort rows
  const sortedRows = [...filteredRows].sort((a, b) => {
    if (sortBy === "amount") {
      const amtA = (a.credit ? Number(a.credit) : 0) - (a.debit ? Number(a.debit) : 0);
      const amtB = (b.credit ? Number(b.credit) : 0) - (b.debit ? Number(b.debit) : 0);
      return sortOrder === "asc" ? amtA - amtB : amtB - amtA;
    }

    const valA = a[sortBy as keyof RegisterRow];
    const valB = b[sortBy as keyof RegisterRow];

    if (valA == null) return sortOrder === "asc" ? 1 : -1;
    if (valB == null) return sortOrder === "asc" ? -1 : 1;

    if (typeof valA === "string" && typeof valB === "string") {
      return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }

    if (typeof valA === "boolean" && typeof valB === "boolean") {
      return sortOrder === "asc"
        ? (valA ? 1 : 0) - (valB ? 1 : 0)
        : (valB ? 1 : 0) - (valA ? 1 : 0);
    }

    return sortOrder === "asc"
      ? (valA as number) - (valB as number)
      : (valB as number) - (valA as number);
  });

  const hasActiveFilters = searchQuery || filterAccount || filterCategory || filterBudget || filterStatus !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setFilterAccount("");
    setFilterCategory("");
    setFilterBudget("");
    setFilterStatus("all");
  };

  const renderSortArrow = (field: keyof RegisterRow | "amount") => {
    if (sortBy !== field) return null;
    return sortOrder === "asc" ? " ▲" : " ▼";
  };

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <p className="text-gray-500 text-sm">No transactions recorded yet.</p>
        <p className="text-gray-400 text-xs mt-1">
          Upload a receipt via Telegram, the iOS Shortcut, or the web upload button.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Filtering Control Bar */}
      <div className="flex flex-col lg:flex-row gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search payee, memo, ref#, account..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-gray-50 border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* Account Filter */}
          <select
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            className="rounded-lg bg-gray-50 border border-gray-300 px-2.5 py-2 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
          >
            <option value="">All Accounts</option>
            {uniqueAccounts.map((acct) => (
              <option key={acct} value={acct}>{acct}</option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-lg bg-gray-50 border border-gray-300 px-2.5 py-2 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
          >
            <option value="">All Categories</option>
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Budget Filter */}
          <select
            value={filterBudget}
            onChange={(e) => setFilterBudget(e.target.value)}
            className="rounded-lg bg-gray-50 border border-gray-300 px-2.5 py-2 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
          >
            <option value="">All Budgets</option>
            {uniqueBudgets.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg bg-gray-50 border border-gray-300 px-2.5 py-2 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="uncleared">Pending (○)</option>
            <option value="cleared">Cleared (C)</option>
            <option value="reconciled">Reconciled (R)</option>
            <option value="flagged">Flagged (⚑)</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 text-xs font-semibold transition shrink-0"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Rows Summary Info */}
      <div className="flex justify-between items-center text-xs text-gray-400 px-1">
        <span>
          Showing {sortedRows.length} of {rows.length} transactions
        </span>
        {sortBy !== "date" && (
          <span className="italic">
            Sorted by {sortBy === "payee_name" ? "payee" : sortBy}{sortOrder === "asc" ? " (asc)" : " (desc)"}
          </span>
        )}
      </div>

      {/* Desktop view: spreadsheet-detailed table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
        <table className="w-full border-collapse text-sm min-w-[1100px]">
          <thead>
            <tr>
              <th className={TH_BASE} onClick={() => toggleSort("account_name")}>Account{renderSortArrow("account_name")}</th>
              <th className={TH_BASE} onClick={() => toggleSort("date")}>Paid Date{renderSortArrow("date")}</th>
              <th className={TH_BASE} onClick={() => toggleSort("invoice_date")}>Inv. Date{renderSortArrow("invoice_date")}</th>
              <th className={TH_BASE} onClick={() => toggleSort("reference_num")}>Ref #{renderSortArrow("reference_num")}</th>
              <th className={TH_BASE} onClick={() => toggleSort("payee_name")}>Payee{renderSortArrow("payee_name")}</th>
              <th className={TH_BASE} onClick={() => toggleSort("category_name")}>Category{renderSortArrow("category_name")}</th>
              <th className={TH_BASE} onClick={() => toggleSort("bucket_name")}>Budget{renderSortArrow("bucket_name")}</th>
              <th className={TH_BASE} onClick={() => toggleSort("notes")}>Memo / Notes{renderSortArrow("notes")}</th>
              <th className={TH_BASE} onClick={() => toggleSort("source")}>Mode{renderSortArrow("source")}</th>
              <th className={`${TH_BASE} text-center`} onClick={() => toggleSort("cleared")}>Clr{renderSortArrow("cleared")}</th>
              <th className={`${TH_BASE} text-right text-red-700`} onClick={() => toggleSort("amount")}>DEBIT{renderSortArrow("amount")}</th>
              <th className={`${TH_BASE} text-right text-emerald-700`} onClick={() => toggleSort("amount")}>CREDIT{renderSortArrow("amount")}</th>
              <th className={`${TH_BASE} text-right`} onClick={() => toggleSort("running_balance")}>Balance{renderSortArrow("running_balance")}</th>
              <th className={`${TH_BASE} text-center`}>Rcpt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedRows.map((row, idx) => {
              const isEven = idx % 2 === 0;
              const isExpanded = expandedId === row.id;
              const rowBg = row.flagged
                ? "bg-amber-50"
                : isExpanded
                ? "bg-blue-50/70"
                : isEven
                ? "bg-white hover:bg-gray-50/70"
                : "bg-gray-50/30 hover:bg-gray-50/70";

              return (
                <Fragment key={row.id}>
                  <tr
                    onClick={() => setExpandedId(isExpanded ? null : row.id)}
                    className={`cursor-pointer transition-colors ${rowBg}`}
                  >
                    {/* Account */}
                    <td className={TD}>
                      {row.account_name ? (
                        <span className="font-medium text-gray-800">{row.account_name}</span>
                      ) : (
                        <span className={PLACEHOLDER}>─</span>
                      )}
                    </td>

                    {/* Paid Date */}
                    <td className={TD}>
                      <span className="font-mono text-gray-700">{row.date}</span>
                    </td>

                    {/* Invoice Date */}
                    <td className={TD}>
                      {row.invoice_date ? (
                        <span className="font-mono text-gray-700">{row.invoice_date}</span>
                      ) : (
                        <span className={PLACEHOLDER}>─</span>
                      )}
                    </td>

                    {/* Ref # */}
                    <td className={TD}>
                      {row.reference_num ? (
                        <span className="font-mono">{row.reference_num}</span>
                      ) : (
                        <span className={PLACEHOLDER}>─</span>
                      )}
                    </td>

                    {/* Payee */}
                    <td className={TD}>
                      <div className="flex items-center gap-1.5">
                        {row.flagged && (
                          <span className="text-amber-500 text-xs leading-none shrink-0" title="Flagged for review">⚑</span>
                        )}
                        <span className="font-medium text-gray-900 max-w-[140px] truncate block">
                          {row.payee_name ?? <span className="text-gray-400 italic">Unknown</span>}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className={TD}>
                      {row.category_name ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium max-w-[110px] truncate">
                          {row.category_name}
                        </span>
                      ) : (
                        <span className={PLACEHOLDER}>─</span>
                      )}
                    </td>

                    {/* Budget */}
                    <td className={TD}>
                      {row.bucket_name ? (
                        <span className="text-gray-600 max-w-[110px] truncate block">{row.bucket_name}</span>
                      ) : (
                        <span className={PLACEHOLDER}>─</span>
                      )}
                    </td>

                    {/* Memo */}
                    <td className={TD}>
                      <span className="text-gray-500 max-w-[150px] truncate block">
                        {row.notes ?? <span className={PLACEHOLDER}>─</span>}
                      </span>
                    </td>

                    {/* Mode */}
                    <td className={TD}>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs font-mono">
                        {SOURCE_LABEL[row.source] ?? row.source}
                      </span>
                    </td>

                    {/* Cleared / Reconciled */}
                    <td className={`${TD} text-center`}>
                      {row.reconciled ? (
                        <span className="text-blue-600 font-semibold text-sm leading-none" title="Reconciled">R</span>
                      ) : row.cleared ? (
                        <span className="text-emerald-600 font-semibold text-sm leading-none" title="Cleared">C</span>
                      ) : (
                        <span className="text-gray-300 text-sm leading-none" title="Pending">○</span>
                      )}
                    </td>

                    {/* DEBIT */}
                    <td className={TD_NUM}>
                      {row.debit ? (
                        <span className="text-gray-900 font-medium">{formatCurrency(Number(row.debit), row.currency)}</span>
                      ) : (
                        <span className={PLACEHOLDER}>─</span>
                      )}
                    </td>

                    {/* CREDIT */}
                    <td className={TD_NUM}>
                      {row.credit ? (
                        <span className="text-emerald-600 font-medium">{formatCurrency(Number(row.credit), row.currency)}</span>
                      ) : (
                        <span className={PLACEHOLDER}>─</span>
                      )}
                    </td>

                    {/* Running Balance */}
                    <td className={TD_NUM}>
                      <span className={`font-semibold tabular-nums ${row.running_balance < 0 ? "text-red-600" : "text-gray-900"}`}>
                        {row.running_balance < 0 ? "−" : ""}
                        {formatCurrency(Math.abs(row.running_balance), row.currency)}
                      </span>
                    </td>

                    {/* Receipt */}
                    <td className={`${TD} text-center`}>
                      {row.receipt_url ? (
                        <a
                          href={row.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-500 hover:text-blue-700 text-base leading-none"
                          title="View receipt"
                        >
                          📎
                        </a>
                      ) : (
                        <span className={PLACEHOLDER}>─</span>
                      )}
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {isExpanded && (
                    <tr className="bg-blue-50/50">
                      <td colSpan={14} className="px-4 py-4 border-b border-gray-200">
                        <div className="flex flex-wrap items-start gap-6">
                          {/* Details grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs flex-1">
                            <div>
                              <p className="text-gray-400 font-medium uppercase tracking-wider mb-0.5">Transaction ID</p>
                              <p className="font-mono text-gray-600 break-all">{row.id}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 font-medium uppercase tracking-wider mb-0.5">Source</p>
                              <p className="text-gray-700 capitalize">{row.source}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 font-medium uppercase tracking-wider mb-0.5">Currency</p>
                              <p className="text-gray-700">{row.currency}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 font-medium uppercase tracking-wider mb-0.5">Status</p>
                              <p className="text-gray-700 font-semibold">
                                {row.reconciled ? "Reconciled" : row.cleared ? "Cleared" : "Pending"}
                              </p>
                            </div>
                            {row.notes && (
                              <div className="col-span-2">
                                <p className="text-gray-400 font-medium uppercase tracking-wider mb-0.5">Notes</p>
                                <p className="text-gray-700 whitespace-pre-wrap">{row.notes}</p>
                              </div>
                            )}
                            {row.receipt_url && (
                              <div>
                                <p className="text-gray-400 font-medium uppercase tracking-wider mb-0.5">Receipt</p>
                                <a href={row.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">
                                  Open receipt ↗
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-2 shrink-0 pt-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggle(row.id, "flagged", row.flagged); }}
                              disabled={patching === `${row.id}-flagged`}
                              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                                row.flagged
                                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                  : "bg-gray-100 text-gray-600 hover:bg-amber-100 hover:text-amber-700"
                              }`}
                            >
                              {row.flagged ? "⚑ Flagged" : "⚐ Flag"}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggle(row.id, "cleared", row.cleared); }}
                              disabled={patching === `${row.id}-cleared` || row.reconciled}
                              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                                row.cleared
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                  : "bg-gray-100 text-gray-600 hover:bg-emerald-100 hover:text-emerald-700"
                              }`}
                            >
                              {row.cleared ? "✓ Cleared" : "○ Clear"}
                            </button>
                            {row.cleared && (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggle(row.id, "reconciled", row.reconciled); }}
                                disabled={patching === `${row.id}-reconciled`}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                                  row.reconciled
                                    ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                    : "bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700"
                                }`}
                              >
                                {row.reconciled ? "R Reconciled" : "Reconcile"}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>

          {/* Totals footer */}
          <tfoot>
            <tr className="border-t-2 border-gray-300 bg-gray-50">
              <td colSpan={10} className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Totals
              </td>
              <td className={`${TD_NUM} font-bold text-gray-900 border-t-2 border-gray-300`}>
                {formatCurrency(sortedRows.reduce((s, r) => s + (r.debit ? Number(r.debit) : 0), 0), "JMD")}
              </td>
              <td className={`${TD_NUM} font-bold text-emerald-700 border-t-2 border-gray-300`}>
                {formatCurrency(sortedRows.reduce((s, r) => s + (r.credit ? Number(r.credit) : 0), 0), "JMD")}
              </td>
              <td className={`${TD_NUM} font-bold border-t-2 border-gray-300`}>
                <span className={sortedRows[sortedRows.length - 1]?.running_balance < 0 ? "text-red-600" : "text-gray-900"}>
                  {formatCurrency(Math.abs(sortedRows[sortedRows.length - 1]?.running_balance ?? 0), "JMD")}
                </span>
              </td>
              <td className="border-t-2 border-gray-300" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile view: simplified transaction cards */}
      <div className="md:hidden space-y-3">
        {sortedRows.map((row) => {
          const isExpanded = expandedId === row.id;
          const isDebit = !!row.debit;
          const amt = isDebit ? row.debit : row.credit;

          return (
            <div
              key={row.id}
              onClick={() => setExpandedId(isExpanded ? null : row.id)}
              className={`rounded-xl border p-4 transition bg-white shadow-xs cursor-pointer ${
                row.flagged ? "border-amber-300 bg-amber-50/20" : isExpanded ? "border-blue-400" : "border-gray-200"
              }`}
            >
              {/* Top row: Payee & Date */}
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {row.flagged && <span className="text-amber-500 text-sm leading-none shrink-0">⚑</span>}
                  <span className="font-semibold text-gray-900 truncate">
                    {row.payee_name ?? <span className="text-gray-400 italic">Unknown</span>}
                  </span>
                </div>
                <span className="text-xs font-mono text-gray-500 shrink-0">{row.date}</span>
              </div>

              {/* Middle row: Account & Category/Budget */}
              <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                <span className="truncate max-w-[150px]">{row.account_name ?? "No Account"}</span>
                <div className="flex items-center gap-1 min-w-0">
                  {row.category_name && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium text-[10px] truncate max-w-[100px]">
                      {row.category_name}
                    </span>
                  )}
                  {row.bucket_name && (
                    <span className="text-[10px] text-gray-400 truncate max-w-[80px]">({row.bucket_name})</span>
                  )}
                </div>
              </div>

              {/* Bottom row: Status & Amount */}
              <div className="flex items-end justify-between mt-3.5">
                <div className="flex items-center gap-1.5">
                  {row.reconciled ? (
                    <span className="text-[10px] font-semibold text-blue-600 px-1 border border-blue-200 rounded bg-blue-50/30" title="Reconciled">R</span>
                  ) : row.cleared ? (
                    <span className="text-[10px] font-semibold text-emerald-600 px-1 border border-emerald-200 rounded bg-emerald-50/30" title="Cleared">C</span>
                  ) : (
                    <span className="text-[10px] font-semibold text-gray-300 px-1 border border-gray-200 rounded" title="Pending">○</span>
                  )}
                  <span className="text-[10px] text-gray-400 font-mono">
                    Bal: {formatCurrency(row.running_balance, row.currency)}
                  </span>
                </div>
                <span className={`text-sm font-bold ${isDebit ? "text-gray-900" : "text-emerald-600"}`}>
                  {isDebit ? "−" : "+"}
                  {formatCurrency(Number(amt), row.currency)}
                </span>
              </div>

              {/* Expanded Mobile Section */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 text-xs text-gray-700" onClick={(e) => e.stopPropagation()}>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-3 font-mono">
                    <div>
                      <span className="text-gray-400 block text-[9px] uppercase tracking-wider mb-0.5">Transaction ID</span>
                      <span className="break-all text-gray-600 block">{row.id}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[9px] uppercase tracking-wider mb-0.5">Mode</span>
                      <span className="text-gray-600 block">{SOURCE_LABEL[row.source] ?? row.source}</span>
                    </div>
                    {row.invoice_date && (
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase tracking-wider mb-0.5">Invoice Date</span>
                        <span className="text-gray-600 block">{row.invoice_date}</span>
                      </div>
                    )}
                    {row.reference_num && (
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase tracking-wider mb-0.5">Ref #</span>
                        <span className="text-gray-600 block">{row.reference_num}</span>
                      </div>
                    )}
                  </div>

                  {row.notes && (
                    <div>
                      <span className="text-gray-400 block text-[9px] uppercase tracking-wider mb-0.5">Notes / Memo</span>
                      <p className="text-gray-600 whitespace-pre-wrap mt-0.5">{row.notes}</p>
                    </div>
                  )}

                  {row.receipt_url && (
                    <div>
                      <span className="text-gray-400 block text-[9px] uppercase tracking-wider mb-0.5">Receipt</span>
                      <a href={row.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium mt-0.5 inline-block">
                        View Attached File ↗
                      </a>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-gray-50">
                    <button
                      onClick={() => toggle(row.id, "flagged", row.flagged)}
                      disabled={patching === `${row.id}-flagged`}
                      className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold transition-colors disabled:opacity-50 ${
                        row.flagged
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {row.flagged ? "⚑ Flagged" : "⚐ Flag"}
                    </button>
                    <button
                      onClick={() => toggle(row.id, "cleared", row.cleared)}
                      disabled={patching === `${row.id}-cleared` || row.reconciled}
                      className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold transition-colors disabled:opacity-50 ${
                        row.cleared
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {row.cleared ? "✓ Cleared" : "○ Clear"}
                    </button>
                    {row.cleared && (
                      <button
                        onClick={() => toggle(row.id, "reconciled", row.reconciled)}
                        disabled={patching === `${row.id}-reconciled`}
                        className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold transition-colors disabled:opacity-50 ${
                          row.reconciled
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {row.reconciled ? "R Reconcile" : "Reconcile"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
