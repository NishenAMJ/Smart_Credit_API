export interface CursorPageInfo {
  pageSize: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export type PaymentActivityFilter = 'all' | 'payment' | 'disbursement';

export interface PaymentsSummary {
  totalTransactions: number;
  totalCollected: number;
  loansWithActivity: number;
  overdueInstallments: number;
}

export interface PaymentInstallmentSummary {
  totalInstallments: number;
  paidInstallments: number;
  overdueInstallments: number;
  nextDueDate: string | null;
  latestInstallmentStatus: string;
}

export interface PaymentListItem {
  transactionId: string;
  loanId: string;
  installmentId: string | null;
  borrowerId: string;
  borrowerName: string;
  borrowerEmail: string;
  amount: number;
  type: string;
  status: string;
  createdAt: string | null;
  loanStatus: string;
  remainingAmount: number;
  source: 'payment' | 'transaction';
  installmentSummary: PaymentInstallmentSummary;
}

export interface PaymentsResponse {
  lenderId: string;
  summary: PaymentsSummary;
  searchResultCount: number | null;
  transactions: PaymentListItem[];
  pageInfo: CursorPageInfo;
  generatedAt: string;
}

export interface LoanLedgerInstallmentDetail {
  id: string;
  sequence: number;
  status: string;
  dueDate: string | null;
  amount: number;
  paidAmount: number;
  lastPaymentAt: string | null;
  note: string | null;
  payments: LoanLedgerPaymentDetail[];
}

export interface LoanLedgerPaymentDetail {
  id: string;
  amount: number;
  status: string;
  type: string;
  createdAt: string | null;
  source: 'transaction';
  note: string | null;
}

export interface LoanLedgerDetailsResponse {
  lenderId: string;
  loan: {
    id: string;
    borrowerId: string | null;
    status: string;
    amount: number;
    remainingAmount: number;
    interestRate: number;
    tenureMonths: number;
    createdAt: string | null;
  };
  installments: LoanLedgerInstallmentDetail[];
}

export interface RecordInstallmentPaymentInput {
  amount: number;
  paidAt?: string | null;
  note?: string | null;
  paymentMethod?: 'bank_transfer' | 'qr' | 'cash' | 'card';
}

export interface ReceiptSubmissionListItem {
  transactionId: string;
  loanId: string;
  installmentId: string;
  borrowerId: string;
  borrowerName: string;
  amount: number;
  currency: string;
  receiptDocumentId: string;
  submittedAt: string | null;
  status: 'pending_verification';
}

export interface ReceiptVerificationDecisionInput {
  decision: 'approve' | 'reject';
  note?: string | null;
}
