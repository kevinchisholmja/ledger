export function formatJMD(amount: number | string): string {
  return new Intl.NumberFormat("en-JM", {
    style: "currency",
    currency: "JMD",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

export function formatCurrency(amount: number | string, currency: string): string {
  if (currency === "JMD") return formatJMD(amount);
  return new Intl.NumberFormat("en-JM", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}
