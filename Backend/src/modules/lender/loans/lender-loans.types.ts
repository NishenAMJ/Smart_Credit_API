export interface LenderLoanItem {
  id: string;
  applicationId: string | null;
  listingId: string | null;
  borrower: {
    id: string;
    fullName: string;
    email: string;
  };
  currency: string;
  principal: number;
  totalRepayable: number;
  monthlyInstallment: number;
  amountPaid: number;
  remainingBalance: number;
  annualInterestRate: number;
  tenureMonths: number;
  status: string;
  disbursedAt: string | null;
  maturityDate: string | null;
  createdAt: string | null;
}

export interface LenderLoansResponse {
  summary: {
    totalLoans: number;
    activeLoans: number;
    overdueLoans: number;
    completedLoans: number;
    totalPrincipal: number;
    outstandingBalance: number;
  };
  loans: LenderLoanItem[];
  pageInfo: {
    pageSize: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
  generatedAt: string;
}
