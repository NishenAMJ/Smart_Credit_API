import { Injectable } from '@nestjs/common';
import { PaymentsDataService } from './payments-data.service';
import {
  isWithinLenderDateRange,
  parseSriLankaDateRange,
} from '../shared/lender-date-range';
import { isCollectedRepayment } from './payment-transaction.utils';

export type PaymentsCsvExport = {
  csv: string;
  fileName: string;
  recordCount: number;
};

@Injectable()
export class PaymentsExportService {
  constructor(private readonly paymentsData: PaymentsDataService) {}

  async createCsv(
    lenderId: string,
    startDate: string | null | undefined,
    endDate: string | null | undefined,
  ): Promise<PaymentsCsvExport> {
    const range = parseSriLankaDateRange(startDate, endDate);
    const context = await this.paymentsData.loadLenderContext(lenderId);
    const transactions = (
      await this.paymentsData.getTransactions(context.loanIds)
    ).filter(
      (transaction) =>
        transaction.loanId !== null &&
        context.loanIds.has(transaction.loanId) &&
        transaction.amount > 0 &&
        isCollectedRepayment(transaction.type, transaction.status) &&
        isWithinLenderDateRange(transaction.createdAt, range),
    );
    const rows = transactions.map((transaction) => {
      const loan = transaction.loanId
        ? context.loanMap.get(transaction.loanId)
        : undefined;
      const borrower = loan?.borrowerId
        ? context.borrowerMap.get(loan.borrowerId)
        : undefined;

      return [
        borrower?.fullName ?? 'Unknown borrower',
        borrower?.email ?? 'No email',
        this.formatInstallment(transaction.installmentId),
        transaction.amount.toFixed(2),
        this.formatSriLankaDateTime(transaction.createdAt),
        this.formatLabel(transaction.status),
        this.formatLabel(transaction.type),
        transaction.note ?? '',
      ];
    });
    const headers = [
      'Borrower',
      'Email',
      'Installment',
      'Amount (LKR)',
      'Payment Date',
      'Status',
      'Payment Type',
      'Note',
    ];
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => this.escapeCsv(value)).join(','))
      .join('\r\n');

    return {
      csv: `\uFEFF${csv}\r\n`,
      fileName: `smart-credit-payments-${startDate}-to-${endDate}.csv`,
      recordCount: rows.length,
    };
  }

  private escapeCsv(value: string): string {
    const safeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${safeValue.replace(/"/g, '""')}"`;
  }

  private formatInstallment(value: string | null): string {
    if (!value) return 'Not linked';
    const match = /^month_(\d+)$/i.exec(value);
    if (match) return `Installment ${Number(match[1])}`;
    return this.formatLabel(value);
  }

  private formatLabel(value: string): string {
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  private formatSriLankaDateTime(value: Date | null): string {
    if (!value) return 'Unknown';
    const sriLankaDate = new Date(value.getTime() + 5.5 * 60 * 60 * 1000);
    return sriLankaDate.toISOString().slice(0, 16).replace('T', ' ');
  }
}
