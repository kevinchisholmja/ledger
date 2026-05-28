"use client";

import { useState, useTransition } from "react";
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

const TH = "px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap border-b border-gray-200 bg-gray-50";
const TD = "px-3 py-2 text-xs text-gray-700 whitespace-nowrap align-top";
const TD_NUM = "px-3 py-2 text-xs tabular-nums text-right whitespace-nowrap align-top";
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

  async function toggle(id: string, field: "flagged" | "cleared" | "reconciled", current: boolean) {
    setPatching(`${id}-${field}`);
    await patchTransaction(id, { [field]: !current });
    setPatching(null);
    startTransition(() => router.refresh());
  }

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
    <div className="w-full overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
      <table className="w-full border-collapse text-sm min-w-[1100px]">
        <thead>
          <tr>
            <th className={TH} title="Linked bank account">Account</th>
            <th className={TH}>Paid Date</th>
            <th className={TH} title="Invoice/charge date">Inv. Date</th>
            <th className={TH} title="Check #, invoice #, wire ref">Ref #</th>
            <th className={TH}>Payee</th>
            <th className={TH}>Category</th>
            <th className={TH}>Budget</th>
            <th className={TH}>Memo / Notes</th>
            <th className={TH} title="Source of entry">Mode</th>
            <th className={`${TH} text-center`} title="Cleared / Reconciled">Clr</th>
            <th className={`${TH} text-right text-red-700`}>DEBIT</th>
            <th className={`${TH} text-right text-emerald-700`}>CREDIT</th>
            <th className={`${TH} text-right`}>Balance</th>
            <th className={`${TH} text-center`}>Rcpt</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, idx) => {
            const isEven = idx % 2 === 0;
            const isExpanded = expandedId === row.id;
            const rowBg = row.flagged
              ? "bg-amber-50"
              : isExpanded
              ? "bg-blue-50"
              : isEven
              ? "bg-white hover:bg-gray-50"
              : "bg-gray-50/50 hover:bg-gray-50";

            return (
              <>
                <tr
                  key={row.id}
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
                  <tr key={`${row.id}-detail`} className="bg-blue-50">
                    <td colSpan={14} className="px-4 py-3">
                      <div className="flex flex-wrap items-start gap-6">
                        {/* Details grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs flex-1">
                          <div>
                            <p className="text-gray-400 font-medium uppercase tracking-wider mb-0.5">Transaction ID</p>
                            <p className="font-mono text-gray-600 break-all">{row.id}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 font-medium uppercase tracking-wider mb-0.5">Source</p>
                            <p className="text-gray-700">{row.source}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 font-medium uppercase tracking-wider mb-0.5">Currency</p>
                            <p className="text-gray-700">{row.currency}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 font-medium uppercase tracking-wider mb-0.5">Status</p>
                            <p className="text-gray-700">
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
                              <a href={row.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
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
              </>
            );
          })}
        </tbody>

        {/* Totals footer */}
        <tfoot>
          <tr className="border-t-2 border-gray-300 bg-gray-50">
            <td colSpan={10} className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Totals
            </td>
            <td className={`${TD_NUM} font-bold text-gray-900 border-t-2 border-gray-300`}>
              {formatCurrency(rows.reduce((s, r) => s + (r.debit ? Number(r.debit) : 0), 0), "JMD")}
            </td>
            <td className={`${TD_NUM} font-bold text-emerald-700 border-t-2 border-gray-300`}>
              {formatCurrency(rows.reduce((s, r) => s + (r.credit ? Number(r.credit) : 0), 0), "JMD")}
            </td>
            <td className={`${TD_NUM} font-bold border-t-2 border-gray-300`}>
              <span className={rows[rows.length - 1]?.running_balance < 0 ? "text-red-600" : "text-gray-900"}>
                {formatCurrency(Math.abs(rows[rows.length - 1]?.running_balance ?? 0), "JMD")}
              </span>
            </td>
            <td className="border-t-2 border-gray-300" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
