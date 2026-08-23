import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import { BORROWER_MONEY } from '../shared/borrower.constants';
import { RepaymentMethod } from '../applications/dto/loan-application.dto';
import {
  BorrowerInstallmentSummary,
  BorrowerService,
} from '../core/borrower.service';
import { LoanStatus, Repayment } from '../types/borrower.types';
import { CoreLedgerService } from '../../core-ledger/core-ledger.service';

type PaymentRecord = Record<string, unknown> & {
  loanId?: string;
  installmentId?: string;
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
  receiptDocumentId?: unknown;
  rejectionReason?: unknown;
};

type PayHereOrder = {
  orderId: string;
  loanId: string;
  borrowerId: string;
  amount: number;
  currency: string;
  status: string;
  installmentId: string;
  repaymentId?: string | null;
};

type PayHereNotification = {
  merchant_id?: string;
  order_id?: string;
  payment_id?: string;
  payhere_amount?: string;
  payhere_currency?: string;
  status_code?: string;
  md5sig?: string;
};

@Injectable()
export class BorrowerPaymentsService {
  private readonly PAYHERE_ORDERS_COL = 'payherePayments';

  constructor(
    private readonly borrowerService: BorrowerService,
    private readonly configService: ConfigService,
    private readonly firebaseService: FirebaseService,
    private readonly coreLedgerService: CoreLedgerService,
  ) {}

  private get db() {
    return this.firebaseService.db;
  }

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
        installmentId: this.toOptionalString(transaction.installmentId),
        lenderId: this.toOptionalString(transaction.lenderId),
        amount: transaction.amount,
        status: transaction.status,
        paidAt: transaction.paidAt ?? transaction.createdAt,
        createdAt: transaction.createdAt,
        paymentMethod: transaction.paymentMethod ?? transaction.paymentType,
        paymentProofUrl: transaction.paymentProofUrl,
        receiptDocumentId: transaction.receiptDocumentId,
        rejectionReason: transaction.rejectionReason,
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
          ? this.roundMoney(nextInstallment.remainingAmount)
          : this.roundMoney(loan.monthlyInstallment);

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
    const latestRejectedByInstallment = new Map<string, PaymentRecord>();
    for (const repayment of enrichedRepayments) {
      if (
        this.toOptionalString(repayment.status).toLowerCase() !== 'rejected'
      ) {
        continue;
      }
      const key = `${this.toOptionalString(repayment.loanId)}:${this.toOptionalString(repayment.installmentId)}`;
      if (key !== ':' && !latestRejectedByInstallment.has(key)) {
        latestRejectedByInstallment.set(key, repayment);
      }
    }
    const actionableUpcomingPayments = upcomingPayments.map((payment) => {
      const rejected = latestRejectedByInstallment.get(
        `${payment.loanId}:${payment.installmentId ?? ''}`,
      );
      if (!rejected) return payment;

      const reason = this.toOptionalString(rejected.rejectionReason);
      return {
        ...payment,
        status: 'RETRY_REQUIRED',
        verificationStatus: 'rejected',
        statusLabel: 'Receipt rejected',
        statusDetail: reason
          ? `Lender response: ${reason}. Upload a corrected receipt to retry.`
          : 'The lender rejected the receipt. Upload a corrected receipt to retry.',
      };
    });
    const installmentsAwaitingReview = new Set(
      enrichedRepayments
        .filter(
          (repayment) =>
            this.toOptionalString(repayment.status).toLowerCase() ===
            'pending_verification',
        )
        .map(
          (repayment) =>
            `${this.toOptionalString(repayment.loanId)}:${this.toOptionalString(repayment.installmentId)}`,
        ),
    );
    const payableUpcomingPayments = actionableUpcomingPayments.filter(
      (payment) =>
        !installmentsAwaitingReview.has(
          `${payment.loanId}:${payment.installmentId ?? ''}`,
        ),
    );

    payableUpcomingPayments.sort((first, second) => {
      const firstTime = first.dueDate
        ? new Date(first.dueDate).getTime()
        : Infinity;
      const secondTime = second.dueDate
        ? new Date(second.dueDate).getTime()
        : Infinity;

      return firstTime - secondTime;
    });

    return [...payableUpcomingPayments, ...enrichedRepayments];
  }

  makePayment(payload: {
    loanId: string;
    amount?: unknown;
    paymentMethod?: RepaymentMethod;
    transactionReference?: string;
    paymentProofUrl?: string;
    receiptDocumentId?: string;
    borrowerId: string;
  }) {
    return this.borrowerService.makeRepayment({
      loanId: payload.loanId,
      borrowerId: payload.borrowerId,
      amount: Number(payload.amount),
      paymentMethod: payload.paymentMethod ?? RepaymentMethod.QR_PAYMENT,
      transactionReference: payload.transactionReference,
      paymentProofUrl: payload.paymentProofUrl,
      receiptDocumentId: payload.receiptDocumentId,
    });
  }

  async initiatePayHerePayment(payload: {
    loanId: string;
    amount: number;
    borrowerId: string;
    requestBaseUrl: string;
  }) {
    const merchantId = this.configService.get<string>('PAYHERE_MERCHANT_ID');
    const merchantSecret = this.configService.get<string>(
      'PAYHERE_MERCHANT_SECRET',
    );

    if (!merchantId || !merchantSecret) {
      throw new InternalServerErrorException(
        'PayHere is not configured on the server.',
      );
    }

    if (!payload.amount || payload.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0.');
    }

    const [loan, profile, installments] = await Promise.all([
      this.borrowerService.getLoanById(payload.loanId, payload.borrowerId),
      this.borrowerService.getProfile(payload.borrowerId),
      this.borrowerService.getBorrowerLoanInstallments(
        payload.loanId,
        payload.borrowerId,
      ),
    ]);

    if (payload.amount > loan.outstandingBalance) {
      throw new BadRequestException(
        `Payment amount (LKR ${payload.amount}) exceeds outstanding balance (LKR ${loan.outstandingBalance}).`,
      );
    }
    const installment = installments.find((candidate) =>
      this.isUnpaidInstallment(candidate),
    );
    if (!installment) {
      throw new BadRequestException(
        'No unpaid installment is available for this payment.',
      );
    }
    if (Math.abs(payload.amount - installment.remainingAmount) > 0.009) {
      throw new BadRequestException(
        `PayHere must settle the next installment in full with LKR ${installment.remainingAmount}.`,
      );
    }

    const baseUrl = this.getPublicBaseUrl(payload.requestBaseUrl);
    const orderId = `PH-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const currency =
      this.configService.get<string>('PAYHERE_CURRENCY') ?? 'LKR';
    const amount = this.formatAmount(payload.amount);
    const checkoutUrl =
      this.configService.get<string>('PAYHERE_CHECKOUT_URL') ??
      (this.isPayHereSandbox()
        ? 'https://sandbox.payhere.lk/pay/checkout'
        : 'https://www.payhere.lk/pay/checkout');
    const firstName = this.getFirstName(profile.fullName);
    const lastName = this.getLastName(profile.fullName);
    const address = profile.address
      ? [profile.address.line1, profile.address.line2]
          .filter(Boolean)
          .join(', ')
      : 'N/A';
    const city =
      profile.address?.city || profile.address?.district || 'Colombo';
    const country =
      this.configService.get<string>('PAYHERE_COUNTRY') ?? 'Sri Lanka';

    const payment = {
      merchant_id: merchantId,
      return_url:
        this.configService.get<string>('PAYHERE_RETURN_URL') ??
        `${baseUrl}/api/borrower/payments/payhere/result/success`,
      cancel_url:
        this.configService.get<string>('PAYHERE_CANCEL_URL') ??
        `${baseUrl}/api/borrower/payments/payhere/result/cancelled`,
      notify_url:
        this.configService.get<string>('PAYHERE_NOTIFY_URL') ??
        `${baseUrl}/api/borrower/payments/payhere/notify`,
      first_name: firstName,
      last_name: lastName,
      email: profile.email || 'customer@smartcredit.local',
      phone: profile.phone || '0770000000',
      address: address || 'N/A',
      city,
      country,
      order_id: orderId,
      items: `Smart Credit repayment for ${loan.loanId}`,
      currency,
      amount,
      custom_1: payload.borrowerId,
      custom_2: payload.loanId,
      hash: this.generateCheckoutHash(merchantId, orderId, amount, currency),
    };

    await this.db.collection(this.PAYHERE_ORDERS_COL).doc(orderId).set({
      orderId,
      loanId: payload.loanId,
      borrowerId: payload.borrowerId,
      installmentId: installment.installmentId,
      amount: payload.amount,
      formattedAmount: amount,
      currency,
      status: 'initiated',
      checkoutUrl,
      payment,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      orderId,
      paymentPageUrl: `${baseUrl}/api/borrower/payments/payhere/checkout/${orderId}`,
      checkoutUrl,
      payment,
    };
  }

  async renderPayHereCheckout(orderId: string) {
    const doc = await this.db
      .collection(this.PAYHERE_ORDERS_COL)
      .doc(orderId)
      .get();

    if (!doc.exists) {
      throw new BadRequestException('PayHere order not found.');
    }

    const data = doc.data() as { checkoutUrl?: string; payment?: unknown };
    const checkoutUrl = String(data.checkoutUrl ?? '');
    const payment =
      data.payment && typeof data.payment === 'object'
        ? (data.payment as Record<string, string>)
        : null;

    if (!checkoutUrl || !payment) {
      throw new BadRequestException('PayHere order is incomplete.');
    }

    const inputs = Object.entries(payment)
      .map(
        ([name, value]) =>
          `<input type="hidden" name="${this.escapeHtml(name)}" value="${this.escapeHtml(String(value))}" />`,
      )
      .join('\n');

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redirecting to PayHere</title>
    <style>
      body { font-family: Arial, sans-serif; display: grid; min-height: 100vh; place-items: center; margin: 0; color: #111827; }
      main { text-align: center; padding: 24px; }
      button { background: #0f62fe; border: 0; border-radius: 8px; color: #fff; font-weight: 700; padding: 12px 18px; }
    </style>
  </head>
  <body>
    <main>
      <p>Redirecting to PayHere...</p>
      <form id="payhere-form" method="post" action="${this.escapeHtml(checkoutUrl)}">
        ${inputs}
        <button type="submit">Continue to PayHere</button>
      </form>
    </main>
    <script>document.getElementById('payhere-form').submit();</script>
  </body>
</html>`;
  }

  renderPayHereResult(status: 'success' | 'cancelled') {
    const title =
      status === 'success' ? 'Payment submitted' : 'Payment cancelled';
    const detail =
      status === 'success'
        ? 'PayHere is confirming your payment. You can return to Smart Credit and refresh your payments.'
        : 'You can return to Smart Credit and try again when ready.';

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; display: grid; min-height: 100vh; place-items: center; margin: 0; color: #111827; background: #f9fafb; }
      main { max-width: 420px; text-align: center; padding: 24px; }
    </style>
  </head>
  <body><main><h1>${title}</h1><p>${detail}</p></main></body>
</html>`;
  }

  async handlePayHereNotification(payload: PayHereNotification) {
    const merchantId = this.configService.get<string>('PAYHERE_MERCHANT_ID');
    const orderId = payload.order_id;

    if (!merchantId || payload.merchant_id !== merchantId || !orderId) {
      throw new BadRequestException('Invalid PayHere notification.');
    }

    if (!this.isValidPayHereNotification(payload)) {
      throw new BadRequestException('Invalid PayHere signature.');
    }

    const orderRef = this.db.collection(this.PAYHERE_ORDERS_COL).doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      throw new BadRequestException('PayHere order not found.');
    }

    const order = orderDoc.data() as PayHereOrder;
    const statusCode = String(payload.status_code ?? '');
    const notificationAmount = Number(payload.payhere_amount);
    const notificationCurrency = String(payload.payhere_currency ?? '');

    if (
      this.formatAmount(notificationAmount) !==
        this.formatAmount(order.amount) ||
      notificationCurrency !== order.currency
    ) {
      throw new BadRequestException('PayHere payment details do not match.');
    }

    if (order.status === 'completed' && order.repaymentId) {
      return { accepted: true, alreadyProcessed: true };
    }

    if (statusCode !== '2') {
      await orderRef.update({
        status: this.mapPayHereStatus(statusCode),
        payherePaymentId: payload.payment_id ?? null,
        notification: payload,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { accepted: true, completed: false };
    }

    const repayment = await this.coreLedgerService.settleInstallment(
      order.loanId,
      order.installmentId,
      order.borrowerId,
      {
        paymentMethod: 'card',
        externalReference: payload.payment_id ?? order.orderId,
      },
    );

    await orderRef.update({
      status: 'completed',
      repaymentId: repayment.transactionId,
      payherePaymentId: payload.payment_id ?? null,
      notification: payload,
      updatedAt: FieldValue.serverTimestamp(),
      completedAt: FieldValue.serverTimestamp(),
    });

    return {
      accepted: true,
      completed: true,
      repaymentId: repayment.transactionId,
    };
  }

  generateQrToken(loanId: string, borrowerId: string, amount?: number) {
    return this.borrowerService.generateQrToken(loanId, borrowerId, amount);
  }

  verifyQrToken(token: string) {
    return this.borrowerService.verifyQrToken(token);
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
          receiptDocumentId: transaction.receiptDocumentId,
          rejectionReason: transaction.rejectionReason,
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
    receiptDocumentId?: unknown;
    rejectionReason?: unknown;
  }) {
    const status = this.toOptionalString(payment.status).toLowerCase();
    const paymentMethod = this.toOptionalString(
      payment.paymentMethod,
    ).toLowerCase();
    const hasReceipt =
      (typeof payment.receiptDocumentId === 'string' &&
        payment.receiptDocumentId.trim().length > 0) ||
      (typeof payment.paymentProofUrl === 'string' &&
        payment.paymentProofUrl.trim().length > 0);

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
        statusDetail: this.toOptionalString(payment.rejectionReason)
          ? `Lender response: ${this.toOptionalString(payment.rejectionReason)}`
          : 'Payment was not approved. Please retry or contact support.',
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

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
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

  private generateCheckoutHash(
    merchantId: string,
    orderId: string,
    amount: string,
    currency: string,
  ) {
    const merchantSecret = this.configService.get<string>(
      'PAYHERE_MERCHANT_SECRET',
    );
    const hashedSecret = this.md5(merchantSecret ?? '').toUpperCase();

    return this.md5(
      `${merchantId}${orderId}${amount}${currency}${hashedSecret}`,
    ).toUpperCase();
  }

  private isValidPayHereNotification(payload: PayHereNotification) {
    const merchantSecret = this.configService.get<string>(
      'PAYHERE_MERCHANT_SECRET',
    );
    const localMd5sig = this.md5(
      `${payload.merchant_id ?? ''}${payload.order_id ?? ''}${payload.payhere_amount ?? ''}${payload.payhere_currency ?? ''}${payload.status_code ?? ''}${this.md5(merchantSecret ?? '').toUpperCase()}`,
    ).toUpperCase();

    return localMd5sig === String(payload.md5sig ?? '').toUpperCase();
  }

  private md5(value: string) {
    return createHash('md5').update(value).digest('hex');
  }

  private formatAmount(amount: number) {
    return Number(amount).toFixed(2);
  }

  private isPayHereSandbox() {
    return ['true', '1', 'yes', 'sandbox'].includes(
      String(this.configService.get<string>('PAYHERE_SANDBOX') ?? '')
        .trim()
        .toLowerCase(),
    );
  }

  private getPublicBaseUrl(requestBaseUrl: string) {
    const configured =
      this.configService.get<string>('PAYHERE_PUBLIC_BASE_URL') ??
      this.configService.get<string>('PUBLIC_API_BASE_URL') ??
      this.configService.get<string>('API_PUBLIC_URL');

    return (configured || requestBaseUrl)
      .replace(/\/api\/?$/, '')
      .replace(/\/$/, '');
  }

  private getFirstName(fullName?: string) {
    const parts = String(fullName ?? 'Smart Credit')
      .trim()
      .split(/\s+/);
    return parts[0] || 'Smart';
  }

  private getLastName(fullName?: string) {
    const parts = String(fullName ?? 'Customer')
      .trim()
      .split(/\s+/);
    return parts.length > 1 ? parts.slice(1).join(' ') : 'Customer';
  }

  private mapPayHereStatus(statusCode: string) {
    if (statusCode === '0') return 'pending';
    if (statusCode === '-1') return 'cancelled';
    if (statusCode === '-2') return 'failed';
    if (statusCode === '-3') return 'charged_back';
    return 'unknown';
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
