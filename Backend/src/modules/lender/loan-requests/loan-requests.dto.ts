export type LoanRequestDecisionResponse = {
  requestId: string;
  status: 'converted' | 'rejected';
  updatedAt: string;
  loanId?: string;
  agreementId?: string;
};
