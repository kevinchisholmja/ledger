"use client";

import { useRouter } from "next/navigation";

export type ViewPeriod = "week" | "fortnight" | "month" | "quarter" | "year";

const OPTIONS: { value: ViewPeriod; label: string }[] = [
  { value: "week", label: "Current Week" },
  { value: "fortnight", label: "Current Fortnight" },
  { value: "month", label: "Current Month" },
  { value: "quarter", label: "Current Quarter" },
  { value: "year", label: "Current Year" },
];

export function isValidViewPeriod(v: string | undefined): v is ViewPeriod {
  return OPTIONS.some((o) => o.value === v);
}

export default function PeriodSelector({ current }: { current: ViewPeriod }) {
  const router = useRouter();

  return (
    <select
      value={current}
      onChange={(e) => router.push(`/?period=${e.target.value}`)}
      className="text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
