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
  constructor(private readonly firebaseService: FirebaseService) {}

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

  private async getCount(query: FirebaseFirestore.Query): Promise<number> {
    const snapshot = await query.count().get();
    return snapshot.data().count;
  }

  async getUsersReport(): Promise<{ success: boolean; data: UserReport }> {
    try {
      const db = this.firebaseService.db;
      const usersCollection = db.collection('users');

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      const monthStart = new Date(currentYear, currentMonth, 1);
      const [
        totalUsers,
        suspendedUsers,
        inactiveUsers,
        pendingUsers,
        borrowers,
        lenders,
        admins,
        newUsersThisMonth,
      ] = await Promise.all([
        this.getCount(usersCollection),
        this.getCount(usersCollection.where('status', '==', 'suspended')),
        this.getCount(usersCollection.where('status', '==', 'inactive')),
        this.getCount(usersCollection.where('accountStatus', '==', 'pending')),
        this.getCount(usersCollection.where('role', 'array-contains', 'borrower')),
        this.getCount(usersCollection.where('role', 'array-contains', 'lender')),
        this.getCount(usersCollection.where('role', 'array-contains', 'admin')),
        this.getCount(usersCollection.where('createdAt', '>=', monthStart)),
      ]);
      const activeUsers = Math.max(
        totalUsers - suspendedUsers - inactiveUsers - pendingUsers,
        0,
      );

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
      const loansCollection = db.collection('loans');
      const requestsCollection = db.collection('loanRequests');
      const [
        totalLoans,
        activeLoans,
        completedLoans,
        defaultedLoans,
        acceptedRequests,
        pendingRequests,
        rejectedRequests,
        loansSnapshot,
      ] = await Promise.all([
        this.getCount(loansCollection),
        this.getCount(loansCollection.where('status', '==', 'active')),
        this.getCount(loansCollection.where('status', '==', 'completed')),
        this.getCount(loansCollection.where('status', '==', 'defaulted')),
        this.getCount(requestsCollection.where('status', '==', 'accepted')),
        this.getCount(requestsCollection.where('status', '==', 'pending')),
        this.getCount(requestsCollection.where('status', '==', 'rejected')),
        loansCollection.select('principalAmount').get(),
      ]);

      let totalAmount = 0;

      loansSnapshot.forEach((doc) => {
        const loan = doc.data();

        if (loan.principalAmount) {
          totalAmount += Number(loan.principalAmount);
        }
      });

      const averageLoanAmount = totalLoans > 0 ? totalAmount / totalLoans : 0;

      return {
        success: true,
        data: {
          totalLoans,
          activeLoans,
          completedLoans,
          defaultedLoans,
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
      const transactionsCollection = db.collection('transactions');
      const [totalTransactions, failedTransactions, completedTransactions, txnSnapshot] =
        await Promise.all([
          this.getCount(transactionsCollection),
          this.getCount(transactionsCollection.where('status', '==', 'failed')),
          this.getCount(
            transactionsCollection.where('status', '==', 'completed'),
          ),
          transactionsCollection
            .select('status', 'verifiedByLender', 'amount', 'paymentType', 'type')
            .get(),
        ]);

      let successfulTransactions = 0;
      let totalVolume = 0;
      const transactionsByType: { [key: string]: number } = {};

      txnSnapshot.forEach((doc) => {
        const txn = doc.data();

        if (txn.verifiedByLender === true || txn.status === 'completed') {
          successfulTransactions++;
        }

        if (txn.amount) {
          totalVolume += Number(txn.amount);
        }

        const transactionType = txn.paymentType || txn.type || 'manual';
        transactionsByType[transactionType] =
          (transactionsByType[transactionType] || 0) + 1;
      });

      const normalizedSuccessfulTransactions = Math.max(
        successfulTransactions,
        completedTransactions,
      );
      const pendingTransactions = Math.max(
        totalTransactions - normalizedSuccessfulTransactions - failedTransactions,
        0,
      );

      const averageAmount =
        totalTransactions > 0 ? totalVolume / totalTransactions : 0;

      return {
        success: true,
        data: {
          totalTransactions,
          successfulTransactions: normalizedSuccessfulTransactions,
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
        db
          .collection('transactions')
          .select('amount', 'platformFee', 'fee', 'paidAt', 'createdAt')
          .get(),
        db.collection('loans').select('totalRepayable', 'principalAmount').get(),
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalUsers,
        totalLoans,
        activeDisputesOpen,
        activeDisputesInProgress,
        activeDisputesEscalated,
        newUsersToday,
        loansCreatedToday,
        disputesResolvedToday,
        pendingRequests,
        pendingKyc,
        totalDisputes,
        resolvedDisputes,
        txnSnapshot,
      ] = await Promise.all([
        this.getCount(db.collection('users')),
        this.getCount(db.collection('loans')),
        this.getCount(db.collection('disputes').where('status', '==', 'open')),
        this.getCount(
          db.collection('disputes').where('status', '==', 'in-progress'),
        ),
        this.getCount(
          db.collection('disputes').where('status', '==', 'escalated'),
        ),
        this.getCount(db.collection('users').where('createdAt', '>=', today)),
        this.getCount(
          db.collection('loanRequests').where('createdAt', '>=', today),
        ),
        this.getCount(
          db.collection('disputes').where('resolvedAt', '>=', today),
        ),
        this.getCount(
          db.collection('loanRequests').where('status', '==', 'pending'),
        ),
        this.getCount(
          db.collection('users').where('accountStatus', '==', 'pending'),
        ),
        this.getCount(db.collection('disputes')),
        this.getCount(db.collection('disputes').where('status', '==', 'resolved')),
        db
          .collection('transactions')
          .select('amount', 'platformFee', 'fee', 'paidAt', 'createdAt')
          .get(),
      ]);

      const activeDisputes =
        activeDisputesOpen +
        activeDisputesInProgress +
        activeDisputesEscalated;
      let transactionsToday = 0;
      let totalRevenue = 0;

      txnSnapshot.forEach((doc) => {
        const txn = doc.data();
        const createdAt = txn.paidAt?.toDate?.() ?? txn.createdAt?.toDate?.();

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
            totalUsers,
            totalLoans,
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
              totalDisputes > 0
                ? Number(
                    (resolvedDisputes / totalDisputes).toFixed(2),
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
