export interface CursorPageInfo {
  pageSize: number;
  hasMore: boolean;
  nextCursor: string | null;
}

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
  status: string;
  dueDate: string | null;
  amount: number;
  paidAmount: number;
  lastPaymentAt: string | null;
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
}
