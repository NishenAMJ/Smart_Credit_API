export interface PaymentSlipData {
  loanId: string;
  borrowerId: string;
  amount: number;
  dueDate?: string;
  referenceNumber?: string;
  qrVersion: string; // For future QR format versioning
}
