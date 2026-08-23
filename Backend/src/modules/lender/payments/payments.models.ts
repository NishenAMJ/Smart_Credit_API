export type LoanRecord = {
  id: string;
  borrowerId: string | null;
  amount: number;
  remainingAmount: number;
  interestRate: number;
  tenureMonths: number;
  status: string;
  createdAt: Date | null;
};

export type TransactionRecord = {
  id: string;
  loanId: string | null;
  installmentId: string | null;
  paymentId: string | null;
  type: string;
  status: string;
  amount: number;
  createdAt: Date | null;
  source: 'payment' | 'transaction';
  note: string | null;
};

export type BorrowerProfile = {
  fullName: string;
  email: string;
};

export type InstallmentRecord = {
  id: string;
  status: string;
  dueDate: Date | null;
  amount: number;
  paidAmount: number;
};

export type LenderLedgerContext = {
  lenderId: string;
  loans: LoanRecord[];
  loanIds: Set<string>;
  loanIdsList: string[];
  loanMap: Map<string, LoanRecord>;
  borrowerMap: Map<string, BorrowerProfile>;
};
