export function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(amount);
}
