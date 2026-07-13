export type LoanRequestDecisionResponse = {
  requestId: string;
  status: 'approved' | 'rejected';
  updatedAt: string;
};
