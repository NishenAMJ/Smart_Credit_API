import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { RoleNotificationService } from '../../../common/notifications/role-notification.service';
import { randomUUID } from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { PayHereService } from '../../../common/payhere/payhere.service';
import type { PayHereNotification } from '../../../common/payhere/payhere.types';
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
  amountMinor?: unknown;
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
  lenderId?: string;
  amount: number;
  amountMinor?: number;
  currency: string;
  status: string;
  installmentId: string;
  repaymentId?: string | null;
  expiresAt?: unknown;
  lastReconciledAt?: unknown;
};

@Injectable()
export class BorrowerPaymentsService implements OnModuleInit, OnModuleDestroy {
  private readonly PAYHERE_ORDERS_COL = 'payherePayments';
  private reconciliationTimer?: NodeJS.Timeout;

  constructor(
    private readonly borrowerService: BorrowerService,
    private readonly firebaseService: FirebaseService,
    private readonly coreLedgerService: CoreLedgerService,
    private readonly payHere: PayHereService,
    @Optional() private readonly roleNotifications?: RoleNotificationService,
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
        amount: this.readTransactionAmount(transaction),
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
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount)) {
      throw new BadRequestException(
        'Repayment amount must be a finite number.',
      );
    }

    return this.borrowerService.makeRepayment({
      loanId: payload.loanId,
      borrowerId: payload.borrowerId,
      amount,
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
    const requestedAmountMinor = this.payHere.toMinor(payload.amount);

    const [loan, profile, installments] = await Promise.all([
      this.borrowerService.getLoanById(payload.loanId, payload.borrowerId),
      this.borrowerService.getProfile(payload.borrowerId),
      this.borrowerService.getBorrowerLoanInstallments(
        payload.loanId,
        payload.borrowerId,
      ),
    ]);

    if (requestedAmountMinor > this.payHere.toMinor(loan.outstandingBalance)) {
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
    const installmentAmountMinor = this.payHere.toMinor(
      installment.remainingAmount,
    );
    if (requestedAmountMinor !== installmentAmountMinor) {
      throw new BadRequestException(
        `PayHere must settle the next installment in full with LKR ${installment.remainingAmount}.`,
      );
    }

    if (
      (loan as unknown as { paymentReviewStatus?: string })
        .paymentReviewStatus === 'chargeback_review'
    ) {
      throw new BadRequestException(
        'Card payments are paused while a previous payment is under review.',
      );
    }

    const baseUrl = this.payHere.publicBaseUrl(payload.requestBaseUrl);
    const orderId = `PH-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const currency = 'LKR';
    const amount = this.payHere.formatMinor(requestedAmountMinor);
    const checkoutUrl = this.payHere.checkoutUrl();
    const firstName = this.getFirstName(profile.fullName);
    const lastName = this.getLastName(profile.fullName);
    const address = profile.address
      ? [profile.address.line1, profile.address.line2]
          .filter(Boolean)
          .join(', ')
      : 'N/A';
    const city =
      profile.address?.city || profile.address?.district || 'Colombo';
    const country = 'Sri Lanka';
    if (!profile.email?.trim() || !profile.phone?.trim()) {
      throw new BadRequestException(
        'A verified email address and phone number are required for card payments.',
      );
    }
    const urls = this.payHere.urls('borrower/payments', payload.requestBaseUrl);

    const payment = {
      merchant_id: this.payHere.merchantId(),
      return_url: urls.returnUrl,
      cancel_url: urls.cancelUrl,
      notify_url: urls.notifyUrl,
      first_name: firstName,
      last_name: lastName,
      email: profile.email.trim(),
      phone: profile.phone.trim(),
      address: address || 'N/A',
      city,
      country,
      order_id: orderId,
      items: `Smart Credit repayment for ${loan.loanId}`,
      currency,
      amount,
      custom_1: payload.borrowerId,
      custom_2: payload.loanId,
      hash: this.payHere.checkoutHash(orderId, amount, currency),
    };
    const expiresAt = Timestamp.fromMillis(Date.now() + 30 * 60_000);
    const installmentRef = this.db
      .collection('loans')
      .doc(payload.loanId)
      .collection('installments')
      .doc(installment.installmentId);
    const orderRef = this.db.collection(this.PAYHERE_ORDERS_COL).doc(orderId);
    let effectiveOrderId = orderId;
    let effectiveExpiresAt = expiresAt;
    await this.db.runTransaction(async (transaction) => {
      const installmentSnapshot = await transaction.get(installmentRef);
      if (!installmentSnapshot.exists) {
        throw new BadRequestException('The installment no longer exists.');
      }
      const installmentData = installmentSnapshot.data() ?? {};
      if (String(installmentData.status).toLowerCase() === 'paid') {
        throw new BadRequestException(
          'This installment has already been paid.',
        );
      }
      if (
        Number(installmentData.amountDueMinor) > 0 &&
        Number(installmentData.amountDueMinor) !== requestedAmountMinor
      ) {
        throw new BadRequestException(
          'The installment amount has changed. Refresh and try again.',
        );
      }
      const activeOrderId = String(installmentData.activePayHereOrderId ?? '');
      if (activeOrderId) {
        const activeOrderRef = this.db
          .collection(this.PAYHERE_ORDERS_COL)
          .doc(activeOrderId);
        const activeOrderSnapshot = await transaction.get(activeOrderRef);
        const activeOrder = activeOrderSnapshot.data() ?? {};
        const activeExpiry = this.timestampMillis(activeOrder.expiresAt);
        if (
          activeOrderSnapshot.exists &&
          ['initiated', 'pending', 'processing'].includes(
            String(activeOrder.status),
          ) &&
          activeExpiry > Date.now()
        ) {
          effectiveOrderId = activeOrderId;
          effectiveExpiresAt = activeOrder.expiresAt as Timestamp;
          return;
        }
        if (activeOrderSnapshot.exists) {
          transaction.update(activeOrderRef, {
            status: 'expired',
            expiredAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        }
      }
      transaction.set(orderRef, {
        orderId,
        loanId: payload.loanId,
        lenderId: loan.lenderId,
        borrowerId: payload.borrowerId,
        installmentId: installment.installmentId,
        amount: requestedAmountMinor / 100,
        amountMinor: requestedAmountMinor,
        formattedAmount: amount,
        currency,
        status: 'initiated',
        checkoutUrl,
        payment,
        expiresAt,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      transaction.update(installmentRef, {
        activePayHereOrderId: orderId,
        activePayHereOrderExpiresAt: expiresAt,
        updatedAt: Timestamp.now(),
      });
    });

    return {
      orderId: effectiveOrderId,
      status: 'initiated',
      expiresAt: effectiveExpiresAt.toDate().toISOString(),
      paymentPageUrl: `${baseUrl}/api/borrower/payments/payhere/checkout/${effectiveOrderId}`,
    };
  }

  onModuleInit() {
    if (!this.payHere.reconciliationEnabled()) return;
    this.reconciliationTimer = setInterval(
      () =>
        void this.reconcilePendingPayHereOrders().catch((error) =>
          this.payHere.logReconciliationError('scheduled-borrower-scan', error),
        ),
      5 * 60_000,
    );
    this.reconciliationTimer.unref();
  }

  onModuleDestroy() {
    if (this.reconciliationTimer) clearInterval(this.reconciliationTimer);
  }

  async renderPayHereCheckout(orderId: string) {
    const doc = await this.db
      .collection(this.PAYHERE_ORDERS_COL)
      .doc(orderId)
      .get();

    if (!doc.exists) {
      throw new BadRequestException('PayHere order not found.');
    }

    const data = doc.data() as {
      checkoutUrl?: string;
      payment?: unknown;
      status?: string;
      expiresAt?: unknown;
    };
    if (
      !['initiated', 'pending'].includes(String(data.status)) ||
      this.timestampMillis(data.expiresAt) <= Date.now()
    ) {
      if (['initiated', 'pending'].includes(String(data.status))) {
        await doc.ref.update({
          status: 'expired',
          expiredAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
      throw new BadRequestException(
        'This PayHere checkout has expired or is no longer active.',
      );
    }
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
    const notification = this.payHere.verifyNotification(payload);
    const orderId = notification.orderId;

    const orderRef = this.db.collection(this.PAYHERE_ORDERS_COL).doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      throw new BadRequestException('PayHere order not found.');
    }

    const order = orderDoc.data() as PayHereOrder;
    if (
      notification.amountMinor !==
        (order.amountMinor ?? this.payHere.toMinor(order.amount)) ||
      notification.currency !== order.currency
    ) {
      throw new BadRequestException('PayHere payment details do not match.');
    }
    const eventRef = this.db
      .collection('payherePaymentEvents')
      .doc(`${orderId}_${notification.eventId}`);
    if ((await eventRef.get()).exists) {
      return { accepted: true, alreadyProcessed: true };
    }
    if (notification.status === 'charged_back') {
      await this.freezeChargeback(orderRef, order, notification);
      await eventRef.set({
        ...notification.sanitized,
        eventId: notification.eventId,
        source: 'callback',
        receivedAt: Timestamp.now(),
      });
      return { accepted: true, completed: false, status: 'charged_back' };
    }
    if (order.status === 'completed' && order.repaymentId) {
      await eventRef.set({
        ...notification.sanitized,
        eventId: notification.eventId,
        source: 'callback',
        receivedAt: Timestamp.now(),
      });
      return { accepted: true, alreadyProcessed: true };
    }
    if (notification.status !== 'completed') {
      await orderRef.update({
        status: notification.status,
        payherePaymentId: notification.paymentId,
        lastNotification: notification.sanitized,
        ...(notification.status === 'pending'
          ? {}
          : { payment: FieldValue.delete() }),
        updatedAt: Timestamp.now(),
      });
      await eventRef.set({
        ...notification.sanitized,
        eventId: notification.eventId,
        source: 'callback',
        receivedAt: Timestamp.now(),
      });
      if (notification.status !== 'pending') {
        await this.clearActivePayHereOrder(order);
      }
      return { accepted: true, completed: false };
    }

    await orderRef.update({ status: 'processing', updatedAt: Timestamp.now() });

    let repayment: { transactionId: string };
    try {
      repayment = await this.coreLedgerService.settleInstallment(
        order.loanId,
        order.installmentId,
        order.borrowerId,
        {
          paymentMethod: 'card',
          externalReference: notification.paymentId ?? order.orderId,
        },
      );
    } catch (error) {
      await orderRef.update({
        status: 'processing_failed',
        processingError:
          error instanceof Error
            ? error.message.slice(0, 200)
            : 'Unknown error',
        updatedAt: Timestamp.now(),
      });
      throw error;
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    await this.db.runTransaction(async (transaction) => {
      transaction.update(orderRef, {
        status: 'completed',
        repaymentId: repayment.transactionId,
        payherePaymentId: notification.paymentId,
        lastNotification: notification.sanitized,
        payment: FieldValue.delete(),
        updatedAt: Timestamp.now(),
        completedAt: Timestamp.now(),
      });
      transaction.set(eventRef, {
        ...notification.sanitized,
        eventId: notification.eventId,
        source: 'callback',
        receivedAt: Timestamp.now(),
      });
      transaction.update(
        this.db
          .collection('loans')
          .doc(order.loanId)
          .collection('installments')
          .doc(order.installmentId),
        {
          activePayHereOrderId: null,
          activePayHereOrderExpiresAt: null,
          updatedAt: Timestamp.now(),
        },
      );
    });

    return {
      accepted: true,
      completed: true,
      repaymentId: repayment.transactionId,
    };
  }

  async getPayHereOrderStatus(orderId: string, borrowerId: string) {
    const ref = this.db.collection(this.PAYHERE_ORDERS_COL).doc(orderId);
    const snapshot = await ref.get();
    if (!snapshot.exists)
      throw new BadRequestException('PayHere order not found.');
    const order = snapshot.data() as PayHereOrder;
    if (order.borrowerId !== borrowerId) {
      throw new ForbiddenException(
        'This PayHere order belongs to another borrower.',
      );
    }
    if (
      ['initiated', 'pending', 'processing', 'processing_failed'].includes(
        order.status,
      ) &&
      this.payHere.reconciliationEnabled() &&
      Date.now() - this.timestampMillis(order.lastReconciledAt) > 2 * 60_000
    ) {
      await this.reconcilePayHereOrder(ref, order).catch((error) =>
        this.payHere.logReconciliationError(orderId, error),
      );
      const refreshed = await ref.get();
      Object.assign(order, refreshed.data());
    }
    if (
      ['initiated', 'pending'].includes(order.status) &&
      this.timestampMillis(order.expiresAt) <= Date.now()
    ) {
      await ref.update({
        status: 'expired',
        expiredAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      await this.clearActivePayHereOrder(order);
      order.status = 'expired';
    }
    return {
      orderId,
      status: order.status,
      expiresAt: this.toIsoDate(order.expiresAt),
      repaymentId: order.repaymentId ?? null,
    };
  }

  private async reconcilePayHereOrder(
    orderRef: FirebaseFirestore.DocumentReference,
    order: PayHereOrder,
  ) {
    await orderRef.set({ lastReconciledAt: Timestamp.now() }, { merge: true });
    const retrieved = await this.payHere.retrievePayment(order.orderId);
    if (!retrieved) return;
    const orderAmountMinor =
      order.amountMinor ?? this.payHere.toMinor(order.amount);
    if (
      retrieved.orderId !== order.orderId ||
      retrieved.amountMinor !== orderAmountMinor ||
      retrieved.currency !== order.currency
    ) {
      throw new Error(
        'Retrieved PayHere payment details do not match the order.',
      );
    }
    if (
      retrieved.status === 'CHARGEBACKED' ||
      retrieved.status.startsWith('REFUND')
    ) {
      await this.freezeChargeback(orderRef, order, {
        paymentId: retrieved.paymentId,
        sanitized: {
          orderId: order.orderId,
          paymentId: retrieved.paymentId,
          amount: this.payHere.formatMinor(retrieved.amountMinor),
          currency: retrieved.currency,
          statusCode: retrieved.status,
        },
      });
      return;
    }
    if (retrieved.status !== 'RECEIVED' || order.status === 'completed') return;
    const repayment = await this.coreLedgerService.settleInstallment(
      order.loanId,
      order.installmentId,
      order.borrowerId,
      {
        paymentMethod: 'card',
        externalReference: retrieved.paymentId,
      },
    );
    await orderRef.update({
      status: 'completed',
      repaymentId: repayment.transactionId,
      payherePaymentId: retrieved.paymentId,
      reconciledAt: Timestamp.now(),
      completedAt: Timestamp.now(),
      payment: FieldValue.delete(),
      updatedAt: Timestamp.now(),
    });
  }

  private async reconcilePendingPayHereOrders() {
    const snapshot = await this.db
      .collection(this.PAYHERE_ORDERS_COL)
      .where('status', 'in', [
        'initiated',
        'pending',
        'processing',
        'processing_failed',
      ])
      .limit(100)
      .get();
    for (const document of snapshot.docs) {
      let order = document.data() as PayHereOrder;
      if (
        Date.now() - this.timestampMillis(order.lastReconciledAt) <
        2 * 60_000
      )
        continue;
      await this.reconcilePayHereOrder(document.ref, order).catch((error) =>
        this.payHere.logReconciliationError(document.id, error),
      );
      order = (await document.ref.get()).data() as PayHereOrder;
      if (
        ['initiated', 'pending'].includes(order.status) &&
        this.timestampMillis(order.expiresAt) <= Date.now()
      ) {
        await document.ref.update({
          status: 'expired',
          expiredAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        await this.clearActivePayHereOrder(order);
      }
    }
  }

  private async freezeChargeback(
    orderRef: FirebaseFirestore.DocumentReference,
    order: PayHereOrder,
    notification: {
      paymentId: string | null;
      sanitized: Record<string, string | null>;
    },
  ) {
    const now = Timestamp.now();
    const disputeId = `payhere_chargeback_${order.orderId}`;
    // Firestore expects a promise-returning callback; this phase only queues
    // atomic writes, so it has no asynchronous read to await.
    // eslint-disable-next-line @typescript-eslint/require-await
    await this.db.runTransaction(async (transaction) => {
      transaction.update(orderRef, {
        status: 'charged_back',
        payherePaymentId: notification.paymentId,
        lastNotification: notification.sanitized,
        chargedBackAt: now,
        payment: FieldValue.delete(),
        updatedAt: now,
      });
      transaction.set(
        this.db.collection('loans').doc(order.loanId),
        {
          paymentReviewStatus: 'chargeback_review',
          paymentReviewOrderId: order.orderId,
          updatedAt: now,
        },
        { merge: true },
      );
      if (order.repaymentId) {
        transaction.set(
          this.db.collection('transactions').doc(order.repaymentId),
          {
            providerStatus: 'charged_back',
            riskStatus: 'under_review',
            updatedAt: now,
          },
          { merge: true },
        );
      }
      transaction.set(
        this.db.collection('disputes').doc(disputeId),
        {
          id: disputeId,
          disputeId,
          disputeCode: `PH-${order.orderId}`,
          loanId: order.loanId,
          transactionId: order.repaymentId ?? null,
          installmentId: order.installmentId,
          complainantId: 'system',
          complainantRole: 'borrower',
          respondentId: order.lenderId ?? '',
          respondentRole: 'lender',
          borrowerId: order.borrowerId,
          lenderId: order.lenderId ?? '',
          borrowerName: '',
          lenderName: '',
          category: 'payment',
          subject: 'PayHere chargeback requires review',
          description: `PayHere reported a chargeback or refund for order ${order.orderId}.`,
          desiredOutcome:
            'An administrator must review the provider payment before any ledger adjustment.',
          disputedAmountMinor:
            order.amountMinor ?? this.payHere.toMinor(order.amount),
          currency: order.currency,
          evidenceDocumentIds: [],
          status: 'under_review',
          priority: 'critical',
          assignedAdminId: null,
          resolution: null,
          acknowledgements: {},
          reopenCount: 0,
          responseRequestedFrom: null,
          source: 'payhere',
          createdAt: now,
          updatedAt: now,
          resolvedAt: null,
          closedAt: null,
        },
        { merge: true },
      );
    });
    const notice = {
      eventType: 'payhere_chargeback',
      eventId: order.orderId,
      category: 'payment',
      title: 'Payment chargeback under review',
      message:
        'PayHere reported a chargeback. Card payments for this loan are paused while an administrator reviews it.',
      severity: 'critical' as const,
      entityType: 'dispute',
      entityId: disputeId,
      actionLabel: 'Review dispute',
      actionTarget: '/admin/disputes',
      metadata: { loanId: order.loanId, orderId: order.orderId },
    };
    await Promise.all(
      [
        this.roleNotifications?.createAdmin(notice),
        this.roleNotifications?.createBorrower(order.borrowerId, {
          ...notice,
          actionTarget: 'support',
        }),
        order.lenderId
          ? this.roleNotifications?.createLender(order.lenderId, notice)
          : undefined,
      ]
        .filter(Boolean)
        .map((promise) => Promise.resolve(promise).catch(() => undefined)),
    );
  }

  private async clearActivePayHereOrder(order: PayHereOrder) {
    const installmentRef = this.db
      .collection('loans')
      .doc(order.loanId)
      .collection('installments')
      .doc(order.installmentId);
    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(installmentRef);
      if (
        snapshot.exists &&
        snapshot.get('activePayHereOrderId') === order.orderId
      ) {
        transaction.update(installmentRef, {
          activePayHereOrderId: null,
          activePayHereOrderExpiresAt: null,
          updatedAt: Timestamp.now(),
        });
      }
    });
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
          amount: this.readTransactionAmount(transaction),
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

  private readTransactionAmount(transaction: {
    amount?: unknown;
    amountMinor?: unknown;
  }): number {
    if (transaction.amount !== null && transaction.amount !== undefined) {
      const amount = Number(transaction.amount);
      if (Number.isFinite(amount)) {
        return this.roundMoney(amount);
      }
    }

    const amountMinor = Number(transaction.amountMinor);
    return Number.isFinite(amountMinor)
      ? this.roundMoney(amountMinor / 100)
      : 0;
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

  private timestampMillis(value: unknown) {
    if (value instanceof Timestamp) return value.toMillis();
    if (
      value &&
      typeof value === 'object' &&
      'toMillis' in value &&
      typeof value.toMillis === 'function'
    ) {
      return (value as { toMillis(): number }).toMillis();
    }
    if (value instanceof Date) return value.getTime();
    return typeof value === 'string' ? new Date(value).getTime() : 0;
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

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
