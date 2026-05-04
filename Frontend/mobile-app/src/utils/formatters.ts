/** @format */

export function formatCurrency(amount?: number, currency = "LKR") {
  return `${currency} ${(amount ?? 0).toLocaleString()}`;
}

export function formatDateLabel(value?: any) {
  if (!value) {
    return "-";
  }

  let dateToFormat = value;
  if (
    typeof value === "object" &&
    ("_seconds" in value || "seconds" in value)
  ) {
    const seconds = value._seconds ?? value.seconds;
    if (typeof seconds === "number") {
      dateToFormat = seconds * 1000;
    }
  }

  const date = new Date(dateToFormat);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : "-";
  }
  return date.toLocaleDateString();
}
