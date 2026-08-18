export const PAYMENT_RECEIVED_NOTIFIER = Symbol('PAYMENT_RECEIVED_NOTIFIER');

export type RecordedPaymentNotification = {
  transactionId: string;
  lenderId: string;
  borrowerId: string;
  loanId: string;
  amountMinor: number;
  remainingBalanceMinor: number;
  paidAt: Date;
};

export interface PaymentReceivedNotifier {
  sendForRecordedPayment(event: RecordedPaymentNotification): Promise<void>;
}
