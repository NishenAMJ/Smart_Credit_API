import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';

export interface LenderDashboardSummary {
  totalLoans: number;
  totalEarnings: number;
  pendingApprovals: number;
}

export interface LenderDashboard extends LenderDashboardSummary {
  charts: {
    monthlyEarnings: number[];
    loanCounts: number[];
  };
}

export interface LenderDashboardStats {
  stats: Array<{ label: string; value: number }>;
  charts: LenderDashboard['charts'];
}

@Injectable()
export class LenderMobileService {
  private readonly logger = new Logger(LenderMobileService.name);

  /**
   * Builds the full lender dashboard payload used by the mobile app.
   */
  getDashboard(): LenderDashboard {
    this.logger.log('Fetching lender dashboard data...');

    try {
      const data: LenderDashboard = {
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
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException('Failed to load dashboard data');
    }
  }

  /**
   * Returns the compact dashboard counters shown above the charts.
   */
  getDashboardSummary(): LenderDashboardSummary {
    this.logger.log('Fetching lender dashboard summary...');

    try {
      const summary: LenderDashboardSummary = {
        totalLoans: 120,
        totalEarnings: 54000,
        pendingApprovals: 8,
      };

      this.logger.debug(`Dashboard summary loaded: ${JSON.stringify(summary)}`);
      return summary;
    } catch (error) {
      this.logger.error(
        'Error while fetching lender dashboard summary',
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException(
        'Failed to load dashboard summary',
      );
    }
  }

  /**
   * Returns chart-ready statistics for the lender dashboard.
   */
  getDashboardStats(): LenderDashboardStats {
    this.logger.log('Fetching lender dashboard statistics...');

    try {
      const stats: LenderDashboardStats = {
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
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException(
        'Failed to load dashboard statistics',
      );
    }
  }
}
