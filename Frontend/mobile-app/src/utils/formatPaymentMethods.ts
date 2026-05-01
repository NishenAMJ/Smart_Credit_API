export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  qr_payment: "QR Payment",
  card: "Card",
};

export function formatPaymentMethod(method?: string): string {
  if (!method) return "—";
  const normalizedMethod = method.trim().toLowerCase();
  return PAYMENT_METHOD_LABELS[normalizedMethod] || method;
}
