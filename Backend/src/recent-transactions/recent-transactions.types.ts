export interface CursorPageInfo {
  pageSize: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface RecentTransactionsSummary {
  totalTransactions: number;
  totalCollected: number;
  loansWithActivity: number;
  overdueInstallments: number;
}

export interface RecentTransactionInstallmentSummary {
  totalInstallments: number;
  paidInstallments: number;
  overdueInstallments: number;
  nextDueDate: string | null;
  latestInstallmentStatus: string;
}

export interface RecentTransactionListItem {
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
  installmentSummary: RecentTransactionInstallmentSummary;
}

export interface RecentTransactionsResponse {
  lenderId: string;
  summary: RecentTransactionsSummary;
  transactions: RecentTransactionListItem[];
  pageInfo: CursorPageInfo;
  generatedAt: string;
}

export interface LoanLedgerPaymentDetail {
  id: string;
  amount: number;
  status: string;
  type: string;
  createdAt: string | null;
  source: 'payment' | 'transaction';
  note: string | null;
}

export interface LoanLedgerInstallmentDetail {
  id: string;
  status: string;
  dueDate: string | null;
  amount: number;
  paidAmount: number;
  payments: LoanLedgerPaymentDetail[];
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
