import { Injectable } from '@nestjs/common';
import {
  isWithinLenderDateRange,
  parseSriLankaDateRange,
} from '../shared/lender-date-range';
import { DashboardService } from './dashboard.service';

export type BorrowersCsvExport = {
  csv: string;
  fileName: string;
  recordCount: number;
};

@Injectable()
export class DashboardBorrowersExportService {
  constructor(private readonly dashboardService: DashboardService) {}

  async createCsv(
    lenderId: string,
    startDate: string | null | undefined,
    endDate: string | null | undefined,
  ): Promise<BorrowersCsvExport> {
    const range = parseSriLankaDateRange(startDate, endDate);
    const borrowers =
      await this.dashboardService.getBorrowersForExport(lenderId);
    const rows = borrowers
      .filter((borrower) =>
        isWithinLenderDateRange(
          borrower.firstLoanCreatedAt
            ? new Date(borrower.firstLoanCreatedAt)
            : null,
          range,
        ),
      )
      .sort((left, right) =>
        (left.firstLoanCreatedAt ?? '').localeCompare(
          right.firstLoanCreatedAt ?? '',
        ),
      )
      .map((borrower) => [
        borrower.fullName,
        borrower.email,
        borrower.phone ?? '',
        this.formatSriLankaDate(borrower.firstLoanCreatedAt),
        this.formatLabel(borrower.kycStatus),
        borrower.creditScore?.toString() ?? 'Not available',
        borrower.isActive ? 'Active' : 'Inactive',
        borrower.loanCount.toString(),
        borrower.activeLoansCount.toString(),
        borrower.totalBorrowedAmount.toFixed(2),
        borrower.outstandingAmount.toFixed(2),
        this.formatLabel(borrower.latestLoanStatus),
      ]);
    const headers = [
      'Borrower',
      'Email',
      'Phone',
      'Joined Portfolio',
      'KYC Status',
      'Credit Score',
      'Account Status',
      'Total Loans',
      'Active Loans',
      'Total Borrowed (LKR)',
      'Outstanding (LKR)',
      'Latest Loan Status',
    ];
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => this.escapeCsv(value)).join(','))
      .join('\r\n');

    return {
      csv: `\uFEFF${csv}\r\n`,
      fileName: `smart-credit-borrowers-${startDate}-to-${endDate}.csv`,
      recordCount: rows.length,
    };
  }

  private escapeCsv(value: string): string {
    const safeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${safeValue.replace(/"/g, '""')}"`;
  }

  private formatLabel(value: string): string {
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  private formatSriLankaDate(value: string | null): string {
    if (!value) return 'Unknown';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    const sriLankaDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
    return sriLankaDate.toISOString().slice(0, 10);
  }
}
