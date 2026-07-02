import { Injectable } from '@nestjs/common';
import { BORROWER_MONEY } from '../shared/borrower.constants';
import { RepaymentMethod } from '../applications/dto/loan-application.dto';
import {
  BorrowerInstallmentSummary,
  BorrowerService,
} from '../core/borrower.service';
import { LoanStatus, Repayment } from '../types/borrower.types';

type PaymentRecord = Record<string, unknown> & {
  loanId?: string;
  lenderId?: string;
  paymentId?: string;
  repaymentId?: string;
  transactionId?: string;
  amount?: unknown;
  status?: unknown;
  paidAt?: unknown;
  createdAt?: unknown;
  paymentMethod?: unknown;
  paymentProofUrl?: unknown;
};

@Injectable()
export class BorrowerPaymentsService {
  constructor(private readonly borrowerService: BorrowerService) {}

  async getPayments(borrowerId: string) {
    const loans = await this.borrowerService.getLoans(borrowerId);
    const installmentGroups = await Promise.all(
      loans.map((loan) =>
        this.borrowerService
          .getBorrowerLoanInstallments(loan.loanId, borrowerId)
          .catch((): BorrowerInstallmentSummary[] => []),
      ),
    );
    const installmentsByLoanId = new Map(
      loans.map((loan, index) => [loan.loanId, installmentGroups[index]]),
    );
    const histories = await Promise.all(
      loans.map((loan) =>
        this.borrowerService
          .getRepaymentHistory(loan.loanId, borrowerId)
          .catch((): Repayment[] => []),
      ),
    );
    const repayments: PaymentRecord[] = histories
      .flat()
      .map((repayment) => ({ ...repayment }) as PaymentRecord);
    const loanById = new Map(loans.map((loan) => [loan.loanId, loan]));
    const borrowerTransactions =
      await this.borrowerService.getBorrowerRepaymentTransactions(
        borrowerId,
        loans.map((loan) => loan.loanId),
      );
    const repaymentIds = new Set(
      repayments
        .map((repayment) => repayment.repaymentId ?? repayment.paymentId)
        .filter(Boolean),
    );
    const transactionRepayments: PaymentRecord[] = borrowerTransactions
      .filter((transaction) => {
        const paymentId =
          typeof transaction.paymentId === 'string'
            ? transaction.paymentId
            : typeof transaction.repaymentId === 'string'
              ? transaction.repaymentId
              : null;

        return !paymentId || !repaymentIds.has(paymentId);
      })
      .map((transaction) => ({
        paymentId:
          this.toOptionalString(transaction.paymentId) ||
          this.toOptionalString(transaction.repaymentId) ||
          this.toOptionalString(transaction.transactionId),
        transactionId: this.toOptionalString(transaction.transactionId),
        repaymentId:
          this.toOptionalString(transaction.repaymentId) ||
          this.toOptionalString(transaction.paymentId),
        loanId: this.toOptionalString(transaction.loanId),
        lenderId: this.toOptionalString(transaction.lenderId),
        amount: transaction.amount,
        status: transaction.status,
        paidAt: transaction.paidAt ?? transaction.createdAt,
        createdAt: transaction.createdAt,
        paymentMethod: transaction.paymentMethod ?? transaction.paymentType,
        paymentProofUrl: transaction.paymentProofUrl,
        requiresVerification: transaction.requiresVerification,
        verifiedByLender: transaction.verifiedByLender,
        verificationStatus: transaction.verificationStatus,
        type: transaction.type ?? 'repayment',
      }));
    const allLenderIds = [
      ...loans.map((loan) => loan.lenderId),
      ...repayments.map(
        (repayment) =>
          repayment.lenderId ??
          loanById.get(this.toOptionalString(repayment.loanId))?.lenderId,
      ),
      ...transactionRepayments.map(
        (repayment) =>
          repayment.lenderId ??
          loanById.get(this.toOptionalString(repayment.loanId))?.lenderId,
      ),
    ].filter((lenderId): lenderId is string => typeof lenderId === 'string');
    const lenderNames =
      await this.borrowerService.getLenderNamesMap(allLenderIds);
    const upcomingPayments = loans
      .filter(
        (loan) =>
          loan.status === LoanStatus.ACTIVE &&
          loan.outstandingBalance > BORROWER_MONEY.ROUNDING_DUST_THRESHOLD,
      )
      .map((loan) => {
        const outstandingBalance =
          loan.outstandingBalance <= BORROWER_MONEY.ROUNDING_DUST_THRESHOLD
            ? 0
            : Math.round(loan.outstandingBalance * 100) / 100;
        const nextInstallment = (
          installmentsByLoanId.get(loan.loanId) ?? []
        ).find((installment) => this.isUnpaidInstallment(installment));
        const rawDate = loan.nextDueDate as unknown;
        const dueDate = nextInstallment?.dueDate
          ? nextInstallment.dueDate.toISOString()
          : this.toIsoDate(rawDate);
        const amount = nextInstallment
          ? Math.min(nextInstallment.remainingAmount, outstandingBalance)
          : Math.min(loan.monthlyInstallment, outstandingBalance);

        return {
          paymentId: `upcoming-${loan.loanId}`,
          loanId: loan.loanId,
          installmentId: nextInstallment?.installmentId,
          installmentNumber: nextInstallment?.installmentNumber,
          amount,
          paidAmount: nextInstallment?.paidAmount ?? 0,
          totalInstallmentAmount: nextInstallment?.amount,
          status: 'PENDING',
          verificationStatus: 'pending',
          statusLabel: 'Pending',
          statusDetail: 'This installment is ready for payment.',
          dueDate,
          lenderName:
            lenderNames.get(loan.lenderId) ?? loan.lenderName ?? 'Lender',
        };
      });
    const enrichedRepayments = [...repayments, ...transactionRepayments].map(
      (repayment) => {
        const loan = loanById.get(this.toOptionalString(repayment.loanId));
        const lenderId = repayment.lenderId ?? loan?.lenderId;

        return {
          ...repayment,
          ...this.getPaymentStatusMeta(repayment),
          lenderName:
            lenderNames.get(lenderId ?? '') ?? loan?.lenderName ?? 'Lender',
        };
      },
    );

    upcomingPayments.sort((first, second) => {
      const firstTime = first.dueDate
        ? new Date(first.dueDate).getTime()
        : Infinity;
      const secondTime = second.dueDate
        ? new Date(second.dueDate).getTime()
        : Infinity;

      return firstTime - secondTime;
    });

    return [...upcomingPayments, ...enrichedRepayments];
  }

  makePayment(payload: {
    loanId: string;
    amount?: unknown;
    paymentMethod?: RepaymentMethod;
    transactionReference?: string;
    paymentProofUrl?: string;
    borrowerId: string;
  }) {
    return this.borrowerService.makeRepayment({
      loanId: payload.loanId,
      borrowerId: payload.borrowerId,
      amount: Number(payload.amount),
      paymentMethod: payload.paymentMethod ?? RepaymentMethod.QR_PAYMENT,
      transactionReference: payload.transactionReference,
      paymentProofUrl: payload.paymentProofUrl,
    });
  }

  generateQrToken(loanId: string, borrowerId: string, amount?: number) {
    return this.borrowerService.generateQrToken(loanId, borrowerId, amount);
  }

  verifyQrToken(token: string) {
    return this.borrowerService.verifyQrToken(token);
  }

  uploadReceipt(payload: Record<string, unknown>) {
    return {
      uploaded: true,
      ...payload,
    };
  }

  async getTransactions(borrowerId: string) {
    const loans = await this.borrowerService.getLoans(borrowerId);
    const loanById = new Map(loans.map((loan) => [loan.loanId, loan]));
    const lenderNames = await this.borrowerService.getLenderNamesMap(
      loans.map((loan) => loan.lenderId),
    );
    const histories = await Promise.all(
      loans.map((loan) =>
        this.borrowerService.getRepaymentHistory(loan.loanId, borrowerId),
      ),
    );
    const borrowerTransactions =
      await this.borrowerService.getBorrowerRepaymentTransactions(
        borrowerId,
        loans.map((loan) => loan.loanId),
      );
    const repaymentTransactions = histories.flat().map((repayment) => {
      const loan = loanById.get(repayment.loanId);

      return {
        transactionId: repayment.repaymentId,
        loanId: repayment.loanId,
        amount: repayment.amount,
        status: repayment.status,
        paidAt: repayment.paidAt,
        createdAt: repayment.createdAt,
        paymentMethod: repayment.paymentMethod,
        type: 'repayment',
        lenderName:
          lenderNames.get(loan?.lenderId ?? '') ?? loan?.lenderName ?? 'Lender',
      };
    });
    const transactionPaymentIds = new Set(
      borrowerTransactions
        .map((transaction) =>
          typeof transaction.paymentId === 'string'
            ? transaction.paymentId
            : typeof transaction.repaymentId === 'string'
              ? transaction.repaymentId
              : null,
        )
        .filter(Boolean),
    );
    const topLevelRepaymentTransactions = borrowerTransactions.map(
      (transaction) => {
        const loan = loanById.get(this.toOptionalString(transaction.loanId));

        return {
          transactionId: transaction.transactionId,
          repaymentId: transaction.repaymentId ?? transaction.paymentId,
          paymentId: transaction.paymentId,
          loanId: transaction.loanId,
          amount: transaction.amount,
          status: transaction.status,
          paidAt: transaction.paidAt ?? transaction.createdAt,
          createdAt: transaction.createdAt,
          paymentMethod: transaction.paymentMethod ?? transaction.paymentType,
          paymentProofUrl: transaction.paymentProofUrl,
          requiresVerification: transaction.requiresVerification,
          verifiedByLender: transaction.verifiedByLender,
          verificationStatus: transaction.verificationStatus,
          type: transaction.type ?? 'repayment',
          lenderName:
            lenderNames.get(loan?.lenderId ?? '') ??
            loan?.lenderName ??
            'Lender',
        };
      },
    );
    const fallbackRepaymentTransactions = repaymentTransactions.filter(
      (transaction) => !transactionPaymentIds.has(transaction.transactionId),
    );
    const disbursementTransactions = loans
      .filter((loan) => loan.startDate)
      .map((loan) => ({
        transactionId: loan.loanId,
        loanId: loan.loanId,
        amount: loan.principalAmount,
        status: 'COMPLETED',
        paidAt: loan.startDate,
        createdAt: loan.createdAt,
        type: 'disbursement',
        lenderName:
          lenderNames.get(loan.lenderId) ?? loan.lenderName ?? 'Lender',
      }));
    const transactions = [
      ...topLevelRepaymentTransactions,
      ...fallbackRepaymentTransactions,
      ...disbursementTransactions,
    ];

    return transactions.sort(
      (first, second) =>
        this.toMillis(second.paidAt) - this.toMillis(first.paidAt),
    );
  }

  async getTransactionById(borrowerId: string, transactionId: string) {
    const transactions = await this.getTransactions(borrowerId);

    return (
      transactions.find(
        (transaction) => transaction.transactionId === transactionId,
      ) ?? null
    );
  }

  private getPaymentStatusMeta(payment: {
    status?: unknown;
    paymentMethod?: unknown;
    paymentProofUrl?: unknown;
  }) {
    const status = this.toOptionalString(payment.status).toLowerCase();
    const paymentMethod = this.toOptionalString(
      payment.paymentMethod,
    ).toLowerCase();
    const hasReceipt =
      typeof payment.paymentProofUrl === 'string' &&
      payment.paymentProofUrl.trim().length > 0;

    if (['paid', 'completed', 'success', 'successful'].includes(status)) {
      return {
        verificationStatus: 'approved',
        statusLabel: 'Paid',
        statusDetail: 'Payment completed successfully.',
      };
    }

    if (status === 'failed' || status === 'rejected') {
      return {
        verificationStatus: 'rejected',
        statusLabel: 'Rejected',
        statusDetail:
          'Payment was not approved. Please retry or contact support.',
      };
    }

    if (paymentMethod === 'bank_transfer') {
      return {
        verificationStatus: hasReceipt
          ? 'pending_verification'
          : 'receipt_required',
        statusLabel: hasReceipt ? 'Pending verification' : 'Receipt required',
        statusDetail: hasReceipt
          ? 'Your transfer receipt is waiting for verification.'
          : 'Upload a bank transfer receipt to continue.',
      };
    }

    if (paymentMethod === 'qr_payment') {
      return {
        verificationStatus: 'awaiting_lender_scan',
        statusLabel: 'Waiting for lender scan',
        statusDetail:
          'Show the QR code to your lender to complete this payment.',
      };
    }

    return {
      verificationStatus: 'pending',
      statusLabel: 'Pending',
      statusDetail: 'Payment is pending.',
    };
  }

  private isUnpaidInstallment(installment: {
    status?: string;
    remainingAmount?: number;
  }) {
    return (
      !['paid', 'completed'].includes(
        this.toOptionalString(installment.status).toLowerCase(),
      ) &&
      Number(installment.remainingAmount ?? 0) >
        BORROWER_MONEY.ROUNDING_DUST_THRESHOLD
    );
  }

  private toMillis(value: unknown): number {
    if (!value) {
      return 0;
    }

    if (
      typeof value === 'object' &&
      'toMillis' in value &&
      typeof value.toMillis === 'function'
    ) {
      return (value as { toMillis: () => number }).toMillis();
    }

    return value instanceof Date ? value.getTime() : 0;
  }

  private toOptionalString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private toIsoDate(value: unknown): string | null {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      'toDate' in value &&
      typeof value.toDate === 'function'
    ) {
      const date = (value as { toDate: () => Date }).toDate();
      return date.toISOString();
    }

    return typeof value === 'string' ? value : null;
  }
}
