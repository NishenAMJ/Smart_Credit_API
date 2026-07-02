export interface UserReport {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  borrowers: number;
  lenders: number;
  newUsersThisMonth: number;
  usersByRole: {
    admin: number;
    borrower: number;
    lender: number;
  };
  usersByStatus: {
    active: number;
    suspended: number;
  };
}

export interface LoanReport {
  totalLoans: number;
  activeLoans: number;
  completedLoans: number;
  defaultedLoans: number;
  totalLoanAmount: number;
  averageLoanAmount: number;
  pendingApprovals: number;
  loansByStatus: {
    [key: string]: number;
  };
}

export interface TransactionReport {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  totalTransactionVolume: number;
  averageTransactionAmount: number;
  transactionsByType: {
    [key: string]: number;
  };
}

export interface RevenueReport {
  totalRevenue: number;
  monthlyRevenue: number;
  revenueThisYear: number;
  platformFees: number;
  interestRevenue: number;
  revenueGrowth: number;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
  }>;
}

export interface DashboardAnalytics {
  overview: {
    totalUsers: number;
    totalLoans: number;
    totalRevenue: number;
    activeDisputes: number;
  };
  recentActivity: {
    newUsersToday: number;
    loansCreatedToday: number;
    transactionsToday: number;
    disputesResolvedToday: number;
  };
  trends: {
    userGrowthRate: number;
    loanGrowthRate: number;
    revenueGrowthRate: number;
    disputeResolutionRate: number;
  };
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    count: number;
  }>;
}
