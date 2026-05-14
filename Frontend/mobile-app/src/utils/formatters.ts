/** @format */

export function formatCurrency(amount?: number, currency = "LKR") {
  return `${currency} ${(amount ?? 0).toLocaleString()}`;
}

export function formatDateLabel(value?: string) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
}
