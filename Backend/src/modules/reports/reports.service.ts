import { Injectable } from '@nestjs/common';
import { AggregateField } from 'firebase-admin/firestore';
import { FirebaseService } from '../../firebase/firebase.service';
import { rethrowFirebaseError } from '../../common/firebase-error';
import { AdminQueryCacheService } from '../../common/cache/admin-query-cache.service';
import {
  UserReport,
  LoanReport,
  TransactionReport,
  RevenueReport,
  DashboardAnalytics,
} from './interfaces/reports.interface';

@Injectable()
export class ReportsService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly cache: AdminQueryCacheService = new AdminQueryCacheService(),
  ) {}

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

  private async getCountAndSum(
    query: FirebaseFirestore.Query,
    field: string,
  ): Promise<{ count: number; total: number }> {
    const snapshot = await query
      .aggregate({
        count: AggregateField.count(),
        total: AggregateField.sum(field),
      })
      .get();
    const data = snapshot.data();
    return { count: Number(data.count ?? 0), total: Number(data.total ?? 0) };
  }

  private async getSum(
    query: FirebaseFirestore.Query,
    field: string,
  ): Promise<number> {
    const snapshot = await query
      .aggregate({ total: AggregateField.sum(field) })
      .get();
    return Number(snapshot.data().total ?? 0);
  }

  private async cached<T>(key: string, loader: () => Promise<T>) {
    const result = await this.cache.remember(`admin:reports:${key}`, loader);
    return {
      success: true,
      data: result.value,
      generatedAt: result.generatedAt,
      cacheAgeSeconds: result.cacheAgeSeconds,
    };
  }

  async getUsersReport() {
    try {
      return await this.cached<UserReport>('users', async () => {
        const usersCollection = this.firebaseService.db.collection('users');
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
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
          this.getCount(
            usersCollection.where('accountStatus', '==', 'suspended'),
          ),
          this.getCount(usersCollection.where('status', '==', 'inactive')),
          this.getCount(
            usersCollection.where('accountStatus', '==', 'pending'),
          ),
          this.getCount(
            usersCollection.where('roles', 'array-contains', 'borrower'),
          ),
          this.getCount(
            usersCollection.where('roles', 'array-contains', 'lender'),
          ),
          this.getCount(
            usersCollection.where('roles', 'array-contains', 'admin'),
          ),
          this.getCount(usersCollection.where('createdAt', '>=', monthStart)),
        ]);
        const activeUsers = Math.max(
          totalUsers - suspendedUsers - inactiveUsers - pendingUsers,
          0,
        );
        return {
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
        };
      });
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to generate users report');
    }
  }

  async getLoansReport() {
    try {
      return await this.cached<LoanReport>('loans', async () => {
        const db = this.firebaseService.db;
        const loans = db.collection('loans');
        const applications = db.collection('loanApplications');
        const [
          portfolio,
          activeLoans,
          completedLoans,
          defaultedLoans,
          acceptedRequests,
          pendingRequests,
          rejectedRequests,
        ] = await Promise.all([
          this.getCountAndSum(loans, 'principalMinor'),
          this.getCount(loans.where('status', '==', 'active')),
          this.getCount(loans.where('status', '==', 'completed')),
          this.getCount(loans.where('status', '==', 'defaulted')),
          this.getCount(
            applications.where('status', 'in', [
              'accepted',
              'approved',
              'converted',
            ]),
          ),
          this.getCount(
            applications.where('status', 'in', [
              'pending',
              'submitted',
              'under_review',
            ]),
          ),
          this.getCount(applications.where('status', '==', 'rejected')),
        ]);
        const totalAmount = portfolio.total / 100;
        const averageLoanAmount =
          portfolio.count > 0 ? totalAmount / portfolio.count : 0;
        return {
          totalLoans: portfolio.count,
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
        };
      });
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to generate loans report');
    }
  }

  async getTransactionsReport() {
    try {
      return await this.cached<TransactionReport>('transactions', async () => {
        const transactions = this.firebaseService.db.collection('transactions');
        const types = [
          'disbursement',
          'repayment',
          'platform_fee',
          'listing_boost',
          'refund',
          'adjustment',
        ];
        const [
          volume,
          completedTransactions,
          failedTransactions,
          ...typeCounts
        ] = await Promise.all([
          this.getCountAndSum(transactions, 'amountMinor'),
          this.getCount(transactions.where('status', '==', 'completed')),
          this.getCount(transactions.where('status', '==', 'failed')),
          ...types.map((type) =>
            this.getCount(transactions.where('type', '==', type)),
          ),
        ]);
        const totalVolume = volume.total / 100;
        const transactionsByType = Object.fromEntries(
          types.map((type, index) => [type, typeCounts[index] ?? 0]),
        );
        const pendingTransactions = Math.max(
          volume.count - completedTransactions - failedTransactions,
          0,
        );
        const averageAmount = volume.count > 0 ? totalVolume / volume.count : 0;
        return {
          totalTransactions: volume.count,
          successfulTransactions: completedTransactions,
          failedTransactions,
          pendingTransactions,
          totalTransactionVolume: totalVolume,
          averageTransactionAmount: Math.round(averageAmount * 100) / 100,
          transactionsByType,
        };
      });
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to generate transactions report');
    }
  }

  async getRevenueReport() {
    try {
      return await this.cached<RevenueReport>('revenue', async () => {
        const db = this.firebaseService.db;
        const transactions = db.collection('transactions');
        const loans = db.collection('loans');
        const now = new Date();
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const months = Array.from({ length: 12 }, (_, offset) => {
          const start = new Date(
            now.getFullYear(),
            now.getMonth() - (11 - offset),
            1,
          );
          const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
          return {
            start,
            end,
            key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
          };
        });
        const [
          totalFeesMinor,
          monthlyFeesMinor,
          yearlyFeesMinor,
          interestMinor,
          ...monthlySeries
        ] = await Promise.all([
          this.getSum(transactions, 'platformFeeMinor'),
          this.getSum(
            transactions.where('createdAt', '>=', monthStart),
            'platformFeeMinor',
          ),
          this.getSum(
            transactions.where('createdAt', '>=', yearStart),
            'platformFeeMinor',
          ),
          this.getSum(loans, 'interestAmountMinor'),
          ...months.map(({ start, end }) =>
            this.getSum(
              transactions
                .where('createdAt', '>=', start)
                .where('createdAt', '<', end),
              'platformFeeMinor',
            ),
          ),
        ]);
        return {
          totalRevenue: totalFeesMinor / 100,
          monthlyRevenue: monthlyFeesMinor / 100,
          revenueThisYear: yearlyFeesMinor / 100,
          platformFees: totalFeesMinor / 100,
          interestRevenue: interestMinor / 100,
          revenueGrowth: 0,
          revenueByMonth: months.map((month, index) => ({
            month: month.key,
            revenue: (monthlySeries[index] ?? 0) / 100,
          })),
        };
      });
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to generate revenue report');
    }
  }

  async getDashboardAnalytics() {
    try {
      return await this.cached<DashboardAnalytics>('dashboard', async () => {
        const db = this.firebaseService.db;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [
          totalUsers,
          totalLoans,
          open,
          underReview,
          awaitingResponse,
          escalated,
          legacyInProgress,
          newUsersToday,
          loansCreatedToday,
          disputesResolvedToday,
          pendingRequests,
          pendingKyc,
          totalDisputes,
          resolvedDisputes,
          transactionsToday,
          totalRevenueMinor,
          admins,
          borrowers,
          lenders,
        ] = await Promise.all([
          this.getCount(db.collection('users')),
          this.getCount(db.collection('loans')),
          this.getCount(
            db.collection('disputes').where('status', '==', 'open'),
          ),
          this.getCount(
            db.collection('disputes').where('status', '==', 'under_review'),
          ),
          this.getCount(
            db
              .collection('disputes')
              .where('status', '==', 'awaiting_response'),
          ),
          this.getCount(
            db.collection('disputes').where('status', '==', 'escalated'),
          ),
          this.getCount(
            db.collection('disputes').where('status', '==', 'in-progress'),
          ),
          this.getCount(db.collection('users').where('createdAt', '>=', today)),
          this.getCount(
            db.collection('loanApplications').where('createdAt', '>=', today),
          ),
          this.getCount(
            db.collection('disputes').where('resolvedAt', '>=', today),
          ),
          this.getCount(
            db
              .collection('loanApplications')
              .where('status', '==', 'submitted'),
          ),
          this.getCount(
            db.collection('users').where('accountStatus', '==', 'pending'),
          ),
          this.getCount(db.collection('disputes')),
          this.getCount(
            db.collection('disputes').where('status', '==', 'resolved'),
          ),
          this.getCount(
            db.collection('transactions').where('createdAt', '>=', today),
          ),
          this.getSum(db.collection('transactions'), 'platformFeeMinor'),
          this.getCount(
            db.collection('users').where('roles', 'array-contains', 'admin'),
          ),
          this.getCount(
            db.collection('users').where('roles', 'array-contains', 'borrower'),
          ),
          this.getCount(
            db.collection('users').where('roles', 'array-contains', 'lender'),
          ),
        ]);
        const activeDisputes =
          open + underReview + awaitingResponse + escalated + legacyInProgress;
        const alerts: DashboardAnalytics['alerts'] = [];
        if (activeDisputes > 0)
          alerts.push({
            type: 'warning',
            message: 'Active disputes need attention',
            count: activeDisputes,
          });
        if (pendingRequests > 0)
          alerts.push({
            type: 'info',
            message: 'Loan requests pending review',
            count: pendingRequests,
          });
        if (pendingKyc > 0)
          alerts.push({
            type: 'info',
            message: 'Users waiting for KYC review',
            count: pendingKyc,
          });
        return {
          overview: {
            totalUsers,
            totalLoans,
            totalRevenue: totalRevenueMinor / 100,
            activeDisputes,
          },
          userRoles: { admin: admins, borrower: borrowers, lender: lenders },
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
                ? Number((resolvedDisputes / totalDisputes).toFixed(2))
                : 0,
          },
          alerts,
        };
      });
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to generate dashboard analytics');
    }
  }
}
