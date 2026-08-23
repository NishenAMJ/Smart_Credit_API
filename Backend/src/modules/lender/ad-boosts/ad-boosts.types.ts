export type AdBoostPaymentMethod = 'bank_transfer' | 'card';

export type AdBoostStatus =
  | 'payment_pending'
  | 'pending_verification'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'expired'
  | 'chargeback_review';

export interface AdBoostPlan {
  id: string;
  name: string;
  durationDays: number;
  amountMinor: number;
  currency: 'LKR';
}

export interface AdBoostResponse {
  boostId: string;
  listingId: string;
  lenderId: string;
  plan: AdBoostPlan;
  paymentMethod: AdBoostPaymentMethod;
  status: AdBoostStatus;
  transactionId: string;
  receiptDocumentId: string | null;
  bankReference: string | null;
  rejectionReason: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
}
