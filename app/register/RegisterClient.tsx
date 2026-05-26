"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format";

export interface RegisterRow {
  id: string;
  // Account (Phase A3+: will come from bank_accounts join)
  account_name: string | null;
  // Dates
  date: string;
  invoice_date: string | null;       // Phase A3+
  // Reference
  reference_num: string | null;      // Phase A3+
  // Payee
  merchant: string | null;
  // Classification
  category_name: string | null;
  bucket_name: string | null;
  // Details
  notes: string | null;
  // Provenance
  source: string;
  // Reconciliation
  cleared: boolean;                  // Phase A3+: real cleared column; for now status=confirmed
  // Amounts (all current rows are debits — credit column will populate in Phase A3+)
  debit: string | null;
  credit: string | null;
  currency: string;
  // Running balance (computed from sorted rows)
  running_balance: number;
  // Receipt
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

export default function RegisterClient({ rows }: { rows: RegisterRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      {/* Phase notice */}
      <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
        <span className="text-amber-700 text-xs font-medium">
          Phase A2 view — columns marked
          <span className="font-mono bg-amber-100 rounded px-1 mx-1">─</span>
          will populate in Phase A3 (data migration).
          All current transactions are debits (expense model).
          CREDIT column activates in Phase A3.
        </span>
      </div>

      <table className="w-full border-collapse text-sm min-w-[1100px]">
        <thead>
          <tr>
            {/* Account — Phase A3+ */}
            <th className={TH} title="Linked bank account (Phase A3+)">Account</th>
            {/* Dates */}
            <th className={TH}>Paid Date</th>
            <th className={TH} title="Invoice/charge date (Phase A3+)">Inv. Date</th>
            {/* Reference */}
            <th className={TH} title="Check #, invoice #, wire ref (Phase A3+)">Ref #</th>
            {/* Payee */}
            <th className={TH}>Payee</th>
            {/* Classification */}
            <th className={TH}>Category</th>
            <th className={TH}>Budget</th>
            {/* Details */}
            <th className={TH}>Memo / Notes</th>
            {/* Mode */}
            <th className={TH} title="Source of entry">Mode</th>
            {/* Cleared */}
            <th className={`${TH} text-center`} title="Cleared / Confirmed">Clr</th>
            {/* Amounts */}
            <th className={`${TH} text-right text-red-700`}>DEBIT</th>
            <th className={`${TH} text-right text-emerald-700`}>CREDIT</th>
            {/* Running balance */}
            <th className={`${TH} text-right`}>Balance</th>
            {/* Receipt */}
            <th className={`${TH} text-center`}>Rcpt</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, idx) => {
            const isEven = idx % 2 === 0;
            const isExpanded = expandedId === row.id;
            return (
              <>
                <tr
                  key={row.id}
                  onClick={() => setExpandedId(isExpanded ? null : row.id)}
                  className={`cursor-pointer transition-colors ${
                    isExpanded
                      ? "bg-blue-50"
                      : isEven
                      ? "bg-white hover:bg-gray-50"
                      : "bg-gray-50/50 hover:bg-gray-50"
                  }`}
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

                  {/* Invoice Date — Phase A3+ */}
                  <td className={TD}>
                    {row.invoice_date ? (
                      <span className="font-mono text-gray-700">{row.invoice_date}</span>
                    ) : (
                      <span className={PLACEHOLDER}>─</span>
                    )}
                  </td>

                  {/* Ref # — Phase A3+ */}
                  <td className={TD}>
                    {row.reference_num ? (
                      <span className="font-mono">{row.reference_num}</span>
                    ) : (
                      <span className={PLACEHOLDER}>─</span>
                    )}
                  </td>

                  {/* Payee */}
                  <td className={TD}>
                    <span className="font-medium text-gray-900 max-w-[140px] truncate block">
                      {row.merchant ?? <span className="text-gray-400 italic">Unknown</span>}
                    </span>
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
                      <span className="text-gray-600 max-w-[110px] truncate block">
                        {row.bucket_name}
                      </span>
                    ) : (
                      <span className={PLACEHOLDER}>─</span>
                    )}
                  </td>

                  {/* Memo / Notes */}
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

                  {/* Cleared */}
                  <td className={`${TD} text-center`}>
                    {row.cleared ? (
                      <span className="text-emerald-600 font-semibold text-sm leading-none" title="Confirmed / Cleared">C</span>
                    ) : (
                      <span className="text-gray-300 text-sm leading-none" title="Pending">○</span>
                    )}
                  </td>

                  {/* DEBIT */}
                  <td className={TD_NUM}>
                    {row.debit ? (
                      <span className="text-gray-900 font-medium">
                        {formatCurrency(Number(row.debit), row.currency)}
                      </span>
                    ) : (
                      <span className={PLACEHOLDER}>─</span>
                    )}
                  </td>

                  {/* CREDIT — Phase A3+ */}
                  <td className={TD_NUM}>
                    {row.credit ? (
                      <span className="text-emerald-600 font-medium">
                        {formatCurrency(Number(row.credit), row.currency)}
                      </span>
                    ) : (
                      <span className={PLACEHOLDER}>─</span>
                    )}
                  </td>

                  {/* Running Balance */}
                  <td className={TD_NUM}>
                    <span
                      className={`font-semibold tabular-nums ${
                        row.running_balance < 0 ? "text-red-600" : "text-gray-900"
                      }`}
                    >
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
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
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
                          <p className="text-gray-700">{row.cleared ? "Confirmed" : "Pending"}</p>
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
              {formatCurrency(
                rows.reduce((s, r) => s + (r.debit ? Number(r.debit) : 0), 0),
                "JMD"
              )}
            </td>
            <td className={`${TD_NUM} font-bold text-emerald-700 border-t-2 border-gray-300`}>
              {formatCurrency(
                rows.reduce((s, r) => s + (r.credit ? Number(r.credit) : 0), 0),
                "JMD"
              )}
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
