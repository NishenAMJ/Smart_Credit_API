import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class LenderMobileService {
  private readonly logger = new Logger(LenderMobileService.name);

  getDashboard() {
    this.logger.log('Fetching lender dashboard data...');

    try {
      const data = {
        totalLoans: 120,
        totalEarnings: 54000,
        pendingApprovals: 8,
        charts: {
          monthlyEarnings: [5000, 6000, 7000, 8000, 9000, 10000],
          loanCounts: [10, 15, 20, 25, 30, 20],
        },
      };

      this.logger.debug(`Dashboard data loaded: ${JSON.stringify(data)}`);
      return data;

    } catch (error) {
      this.logger.error(
        'Error while fetching lender dashboard data',
        error.stack,
      );

      throw new InternalServerErrorException(
        'Failed to load dashboard data',
      );
    }
  }

  getDashboardSummary() {
    this.logger.log('Fetching lender dashboard summary...');

    try {
      const summary = {
        totalLoans: 120,
        totalEarnings: 54000,
        pendingApprovals: 8,
      };

      this.logger.debug(`Dashboard summary loaded: ${JSON.stringify(summary)}`);
      return summary;

    } catch (error) {
      this.logger.error(
        'Error while fetching lender dashboard summary',
        error.stack,
      );

      throw new InternalServerErrorException(
        'Failed to load dashboard summary',
      );
    }
  }

  getDashboardStats() {
    this.logger.log('Fetching lender dashboard statistics...');

    try {
      const stats = {
        stats: [
          { label: 'Total Loans', value: 120 },
          { label: 'Total Earnings', value: 54000 },
          { label: 'Pending Approvals', value: 8 },
        ],
        charts: {
          monthlyEarnings: [5000, 6000, 7000, 8000, 9000, 10000],
          loanCounts: [10, 15, 20, 25, 30, 20],
        },
      };

      this.logger.debug(`Dashboard stats loaded: ${JSON.stringify(stats)}`);
      return stats;

    } catch (error) {
      this.logger.error(
        'Error while fetching lender dashboard stats',
        error.stack,
      );

      throw new InternalServerErrorException(
        'Failed to load dashboard statistics',
      );
    }
  }
}