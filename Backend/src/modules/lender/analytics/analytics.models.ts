export type LoanRecord = {
  id: string;
  requestId: string | null;
  borrowerId: string | null;
  amount: number;
  interestRate: number;
  tenureMonths: number;
  remainingAmount: number;
  status: string;
  createdAt: Date | null;
};

export type AdRecord = {
  id: string;
  title: string;
  status: string;
  expiresAt: Date | null;
};

export type RequestRecord = {
  id: string;
  borrowerId: string | null;
  targetLenderId: string | null;
  adId: string | null;
  amount: number;
  tenureMonths: number;
  purpose: string | null;
  status: string;
  createdAt: Date | null;
};

export type TransactionRecord = {
  loanId: string | null;
  type: string;
  amount: number;
  createdAt: Date | null;
};

export type DisputeRecord = {
  id: string;
  loanId: string | null;
  type: string;
  status: string;
  createdAt: Date | null;
};

export type AnalyticsSummaryContext = {
  loans: LoanRecord[];
  ads: AdRecord[];
  requests: RequestRecord[];
  transactions: TransactionRecord[];
  disputes: DisputeRecord[];
  borrowerScores: number[];
};

export type AnalyticsDrilldownContext = {
  loans: LoanRecord[];
  ads: AdRecord[];
  requests: RequestRecord[];
  transactions: TransactionRecord[];
  disputes: DisputeRecord[];
  borrowerNameMap: Map<string, string>;
  loanMap: Map<string, LoanRecord>;
};
