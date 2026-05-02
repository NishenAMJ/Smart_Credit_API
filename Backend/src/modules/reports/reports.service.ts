import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { rethrowFirebaseError } from '../../common/firebase-error';
import {
  UserReport,
  LoanReport,
  TransactionReport,
  RevenueReport,
  DashboardAnalytics,
} from './interfaces/reports.interface';

@Injectable()
export class ReportsService {
  constructor(private readonly firebaseService: FirebaseService) { }

  private getPrimaryRole(
    role: unknown,
  ): 'admin' | 'borrower' | 'lender' | null {
    if (Array.isArray(role)) {
      const firstRole = role[0];
      return typeof firstRole === 'string'
        ? (firstRole as 'admin' | 'borrower' | 'lender')
        : null;
    }

    return typeof role === 'string'
      ? (role as 'admin' | 'borrower' | 'lender')
      : null;
  }

  async getUsersReport(): Promise<{ success: boolean; data: UserReport }> {
    try {
      const db = this.firebaseService.db;
      const usersSnapshot = await db.collection('users').get();

      let totalUsers = 0;
      let activeUsers = 0;
      let suspendedUsers = 0;
      let borrowers = 0;
      let lenders = 0;
      let admins = 0;
      let newUsersThisMonth = 0;

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      usersSnapshot.forEach((doc) => {
        const user = doc.data();
        const primaryRole = this.getPrimaryRole(user.role);
        const status =
          user.status || (user.kycStatus === 'pending' ? 'pending' : 'active');

        totalUsers++;

        if (status === 'active') activeUsers++;
        if (status === 'suspended') suspendedUsers++;

        if (primaryRole === 'borrower') borrowers++;
        if (primaryRole === 'lender') lenders++;
        if (primaryRole === 'admin') admins++;

        if (user.createdAt && typeof user.createdAt.toDate === 'function') {
          const createdDate = user.createdAt.toDate();
          if (
            createdDate.getMonth() === currentMonth &&
            createdDate.getFullYear() === currentYear
          ) {
            newUsersThisMonth++;
          }
        }
      });

      return {
        success: true,
        data: {
          totalUsers,
          activeUsers,
          suspendedUsers,
          borrowers,
          lenders,
          newUsersThisMonth,
          usersByRole: {
            admin: admins,
            borrower: borrowers,
            lender: lenders,
          },
          usersByStatus: {
            active: activeUsers,
            suspended: suspendedUsers,
          },
        },
      };
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to generate users report');
    }
  }

  async getLoansReport(): Promise<{ success: boolean; data: LoanReport }> {
    try {
      const db = this.firebaseService.db;
      const [loansSnapshot, requestsSnapshot] = await Promise.all([
        db.collection('loans').get(),
        db.collection('loanRequests').get(),
      ]);

      let totalLoans = 0;
      let activeLoans = 0;
      let completedLoans = 0;
      let acceptedRequests = 0;
      let pendingRequests = 0;
      let rejectedRequests = 0;
      let totalAmount = 0;

      loansSnapshot.forEach((doc) => {
        const loan = doc.data();
        totalLoans++;

        if (loan.status === 'active') activeLoans++;
        if (loan.status === 'completed') completedLoans++;

        if (loan.principalAmount) {
          totalAmount += Number(loan.principalAmount);
        }
      });

      requestsSnapshot.forEach((doc) => {
        const request = doc.data();

        if (request.status === 'accepted') acceptedRequests++;
        if (request.status === 'pending') pendingRequests++;
        if (request.status === 'rejected') rejectedRequests++;
      });

      const averageLoanAmount = totalLoans > 0 ? totalAmount / totalLoans : 0;

      return {
        success: true,
        data: {
          totalLoans,
          activeLoans,
          completedLoans,
          defaultedLoans: 0,
          totalLoanAmount: totalAmount,
          averageLoanAmount: Math.round(averageLoanAmount * 100) / 100,
          pendingApprovals: pendingRequests,
          loansByStatus: {
            active: activeLoans,
            completed: completedLoans,
            requestsAccepted: acceptedRequests,
            requestsPending: pendingRequests,
            requestsRejected: rejectedRequests,
          },
        },
      };
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to generate loans report');
    }
  }

  async getTransactionsReport(): Promise<{
    success: boolean;
    data: TransactionReport;
  }> {
    try {
      const db = this.firebaseService.db;
      const txnSnapshot = await db.collection('transactions').get();

      let totalTransactions = 0;
      let successfulTransactions = 0;
      let failedTransactions = 0;
      let pendingTransactions = 0;
      let totalVolume = 0;
      const transactionsByType: { [key: string]: number } = {};

      txnSnapshot.forEach((doc) => {
        const txn = doc.data();
        totalTransactions++;

        if (txn.verifiedByLender === true || txn.status === 'completed') {
          successfulTransactions++;
        } else if (txn.status === 'failed') {
          failedTransactions++;
        } else {
          pendingTransactions++;
        }

        if (txn.amount) {
          totalVolume += Number(txn.amount);
        }

        const transactionType = txn.paymentType || txn.type || 'manual';
        transactionsByType[transactionType] =
          (transactionsByType[transactionType] || 0) + 1;
      });

      const averageAmount =
        totalTransactions > 0 ? totalVolume / totalTransactions : 0;

      return {
        success: true,
        data: {
          totalTransactions,
          successfulTransactions,
          failedTransactions,
          pendingTransactions,
          totalTransactionVolume: totalVolume,
          averageTransactionAmount: Math.round(averageAmount * 100) / 100,
          transactionsByType,
        },
      };
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to generate transactions report');
    }
  }

  async getRevenueReport(): Promise<{ success: boolean; data: RevenueReport }> {
    try {
      const db = this.firebaseService.db;
      const [txnSnapshot, loansSnapshot] = await Promise.all([
        db.collection('transactions').get(),
        db.collection('loans').get(),
      ]);

      let totalRevenue = 0;
      let monthlyRevenue = 0;
      let yearlyRevenue = 0;
      let platformFees = 0;
      let interestRevenue = 0;
      const revenueByMonth: { [key: string]: number } = {};

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      loansSnapshot.forEach((doc) => {
        const loan = doc.data();

        if (loan.totalRepayable && loan.principalAmount) {
          interestRevenue += Math.max(
            0,
            Number(loan.totalRepayable) - Number(loan.principalAmount),
          );
        }
      });

      txnSnapshot.forEach((doc) => {
        const txn = doc.data();

        if (!txn.amount) {
          return;
        }

        const fee = Number(txn.platformFee || txn.fee || txn.amount * 0.02);
        totalRevenue += fee;
        platformFees += fee;

        const txnDate = txn.paidAt?.toDate?.() ?? txn.createdAt?.toDate?.();
        if (!txnDate) {
          return;
        }

        const txnMonth = txnDate.getMonth();
        const txnYear = txnDate.getFullYear();

        if (txnMonth === currentMonth && txnYear === currentYear) {
          monthlyRevenue += fee;
        }

        if (txnYear === currentYear) {
          yearlyRevenue += fee;
        }

        const monthKey = `${txnYear}-${String(txnMonth + 1).padStart(2, '0')}`;
        revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + fee;
      });

      const revenueByMonthArray = Object.entries(revenueByMonth)
        .map(([month, revenue]) => ({ month, revenue }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-12);

      return {
        success: true,
        data: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
          revenueThisYear: Math.round(yearlyRevenue * 100) / 100,
          platformFees: Math.round(platformFees * 100) / 100,
          interestRevenue: Math.round(interestRevenue * 100) / 100,
          revenueGrowth: 0,
          revenueByMonth: revenueByMonthArray,
        },
      };
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to generate revenue report');
    }
  }

  async getDashboardAnalytics(): Promise<{
    success: boolean;
    data: DashboardAnalytics;
  }> {
    try {
      const db = this.firebaseService.db;

      const [
        usersSnapshot,
        loansSnapshot,
        requestsSnapshot,
        disputesSnapshot,
        txnSnapshot,
      ] = await Promise.all([
        db.collection('users').get(),
        db.collection('loans').get(),
        db.collection('loanRequests').get(),
        db.collection('disputes').get(),
        db.collection('transactions').get(),
      ]);

      let activeDisputes = 0;
      let disputesResolvedToday = 0;
      let newUsersToday = 0;
      let loansCreatedToday = 0;
      let transactionsToday = 0;
      let totalRevenue = 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      disputesSnapshot.forEach((doc) => {
        const dispute = doc.data();
        if (
          dispute.status === 'open' ||
          dispute.status === 'in-progress' ||
          dispute.status === 'escalated'
        ) {
          activeDisputes++;
        }

        const resolvedAt = dispute.resolvedAt?.toDate?.() || (dispute.resolvedAt instanceof Date ? dispute.resolvedAt : null);
        if (resolvedAt && resolvedAt >= today) {
          disputesResolvedToday++;
        }
      });

      usersSnapshot.forEach((doc) => {
        const user = doc.data();
        const createdAt = user.createdAt?.toDate?.() || (user.createdAt instanceof Date ? user.createdAt : null);
        if (createdAt && createdAt >= today) {
          newUsersToday++;
        }
      });

      requestsSnapshot.forEach((doc) => {
        const request = doc.data();
        const createdAt = request.createdAt?.toDate?.() || (request.createdAt instanceof Date ? request.createdAt : null);
        if (createdAt && createdAt >= today) {
          loansCreatedToday++;
        }
      });

      txnSnapshot.forEach((doc) => {
        const txn = doc.data();
        const createdAt = txn.paidAt?.toDate?.() ?? txn.createdAt?.toDate?.() ?? (txn.paidAt instanceof Date ? txn.paidAt : (txn.createdAt instanceof Date ? txn.createdAt : null));

        if (createdAt && createdAt >= today) {
          transactionsToday++;
        }

        if (txn.amount) {
          totalRevenue += Number(
            txn.platformFee || txn.fee || txn.amount * 0.02,
          );
        }
      });

      const alerts: Array<{
        type: 'warning' | 'error' | 'info';
        message: string;
        count: number;
      }> = [];

      const pendingRequests = requestsSnapshot.docs.filter(
        (doc) => doc.data().status === 'pending',
      ).length;
      const pendingKyc = usersSnapshot.docs.filter(
        (doc) => doc.data().kycStatus === 'pending',
      ).length;

      if (activeDisputes > 0) {
        alerts.push({
          type: 'warning',
          message: 'Active disputes need attention',
          count: activeDisputes,
        });
      }

      if (pendingRequests > 0) {
        alerts.push({
          type: 'info',
          message: 'Loan requests pending review',
          count: pendingRequests,
        });
      }

      if (pendingKyc > 0) {
        alerts.push({
          type: 'info',
          message: 'Users waiting for KYC review',
          count: pendingKyc,
        });
      }

      return {
        success: true,
        data: {
          overview: {
            totalUsers: usersSnapshot.size,
            totalLoans: loansSnapshot.size,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            activeDisputes,
          },
          recentActivity: {
            newUsersToday,
            loansCreatedToday,
            transactionsToday,
            disputesResolvedToday,
          },
          trends: {
            userGrowthRate: 0,
            loanGrowthRate: 0,
            revenueGrowthRate: 0,
            disputeResolutionRate:
              disputesSnapshot.size > 0
                ? Number(
                  (
                    disputesSnapshot.docs.filter(
                      (doc) => doc.data().status === 'resolved',
                    ).length / disputesSnapshot.size
                  ).toFixed(2),
                )
                : 0,
          },
          alerts,
        },
      };
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to generate dashboard analytics');
    }
  }
}
