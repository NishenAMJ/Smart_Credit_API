import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { repaymentTransactionIdFor } from '../../../common/firestore/schema';
import { FirebaseService } from '../../../firebase/firebase.service';
import {
  readDate,
  readNumber,
  readString,
} from '../../../firebase/firestore-query.utils';
import { getNormalizedInstallment } from '../../../firebase/firestore-seed.utils';
import {
  LoanLedgerDetailsResponse,
  RecordInstallmentPaymentInput,
} from './payments.types';
import { PaymentLedgerDetailsService } from './payment-ledger-details.service';
import { PaymentsService } from './payments.service';
import {
  PAYMENT_RECEIVED_NOTIFIER,
  type PaymentReceivedNotifier,
} from '../shared/payment-received-notifier.port';
import { findNextUnsettledInstallmentId } from './installment-order.utils';

@Injectable()
export class InstallmentPaymentService {
  private readonly logger = new Logger(InstallmentPaymentService.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly paymentsService: PaymentsService,
    private readonly ledgerDetailsService: PaymentLedgerDetailsService,
    @Inject(PAYMENT_RECEIVED_NOTIFIER)
    private readonly paymentReceivedNotifier: PaymentReceivedNotifier,
  ) {}

  async record(
    lenderId: string,
    loanId: string,
    installmentId: string,
    input: RecordInstallmentPaymentInput,
    qrContext?: { nonce: string },
  ): Promise<LoanLedgerDetailsResponse | null> {
    const paidAt = input.paidAt?.trim() ? readDate(input.paidAt) : new Date();

    if (!paidAt) {
      throw new BadRequestException('A valid payment date is required.');
    }
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new BadRequestException(
        'Payment amount must be greater than zero.',
      );
    }

    const db = this.firebaseService.getDb();
    const loanRef = db.collection('loans').doc(loanId);
    const installmentRef = loanRef
      .collection('installments')
      .doc(installmentId);
    const installmentsQuery = loanRef.collection('installments');
    const paymentTimestamp = Timestamp.fromDate(paidAt);
    const note = this.normalizeNote(input.note);
    const transactionId = repaymentTransactionIdFor(loanId, installmentId);
    const transactionRef = db.collection('transactions').doc(transactionId);
    const nonceRef = qrContext?.nonce
      ? db.collection('qrNonces').doc(qrContext.nonce)
      : null;

    const recorded = await db.runTransaction(async (transaction) => {
      const [
        loanSnapshot,
        installmentSnapshot,
        ledgerSnapshot,
        nonceSnapshot,
        installmentsSnapshot,
      ] = await Promise.all([
        transaction.get(loanRef),
        transaction.get(installmentRef),
        transaction.get(transactionRef),
        nonceRef ? transaction.get(nonceRef) : Promise.resolve(null),
        transaction.get(installmentsQuery),
      ]);

      if (
        !loanSnapshot.exists ||
        !installmentSnapshot.exists ||
        loanSnapshot.get('lenderId') !== lenderId
      ) {
        return null;
      }

      const loan = loanSnapshot.data() ?? {};
      const installment = installmentSnapshot.data() ?? {};
      const borrowerId = readString(loan.borrowerId);
      if (!borrowerId) {
        throw new BadRequestException(
          'This loan does not have a valid borrower account.',
        );
      }
      if (ledgerSnapshot.exists) {
        return {
          transactionId,
          borrowerId,
          amountMinor: readNumber(ledgerSnapshot.get('amountMinor')),
          remainingBalanceMinor: readNumber(loan.remainingBalanceMinor),
          alreadyRecorded: true,
        };
      }
      const nextInstallmentId = findNextUnsettledInstallmentId(
        installmentsSnapshot.docs,
      );

      if (nextInstallmentId && nextInstallmentId !== installmentId) {
        throw new ConflictException(
          'Installments must be paid in order. Record the earliest unpaid installment first.',
        );
      }
      if (nonceRef) {
        if (!nonceSnapshot?.exists) {
          throw new BadRequestException('QR nonce not found.');
        }
        const nonce = nonceSnapshot.data() ?? {};
        if (nonce.used) {
          throw new BadRequestException('QR code has already been used.');
        }
        if (readNumber(nonce.expiresAt) < Date.now()) {
          throw new BadRequestException('QR code is expired.');
        }
        if (
          readString(nonce.loanId) !== loanId ||
          readString(nonce.borrowerId) !== borrowerId ||
          Math.round(readNumber(nonce.amount) * 100) !==
            Math.round(input.amount * 100)
        ) {
          throw new BadRequestException(
            'QR payment details do not match this installment.',
          );
        }
      }
      const normalizedInstallment = getNormalizedInstallment(installment);
      if (normalizedInstallment.status === 'waived') {
        throw new BadRequestException('This installment has been waived.');
      }
      const installmentAmount = readNumber(installment.amountDueMinor) / 100;
      const paidAmount =
        normalizedInstallment.status === 'paid' ? installmentAmount : 0;
      const outstanding = Math.max(0, installmentAmount - paidAmount);

      if (outstanding <= 0) {
        throw new BadRequestException(
          'This installment is already fully paid.',
        );
      }
      if (input.amount !== outstanding) {
        throw new BadRequestException(
          `This installment must be settled in full with ${outstanding}.`,
        );
      }

      const currentBalance = readNumber(loan.remainingBalanceMinor) / 100;
      const nextBalance = Math.max(0, currentBalance - input.amount);
      const currentStatus = readString(loan.status) ?? 'active';
      const nextStatus =
        nextBalance <= 0
          ? 'completed'
          : currentStatus === 'completed'
            ? 'active'
            : currentStatus;
      transaction.create(transactionRef, {
        transactionId,
        loanId,
        installmentId,
        listingId: readString(loan.listingId),
        amountMinor: Math.round(input.amount * 100),
        platformFeeMinor: 0,
        currency: 'LKR',
        createdAt: paymentTimestamp,
        completedAt: paymentTimestamp,
        type: 'repayment',
        status: 'completed',
        paymentMethod: input.paymentMethod ?? 'bank_transfer',
        externalReference: null,
        idempotencyKey: transactionId,
        receiptDocumentId: null,
        note,
        lenderId,
        borrowerId: readString(loan.borrowerId),
        initiatedByUserId: lenderId,
      });
      transaction.update(installmentRef, {
        status: 'paid',
        paidTransactionId: transactionId,
        paidAt: paymentTimestamp,
        note,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(loanRef, {
        amountPaidMinor: Math.round(
          readNumber(loan.amountPaidMinor) + input.amount * 100,
        ),
        remainingBalanceMinor: Math.round(nextBalance * 100),
        status: nextStatus,
        completedAt: nextBalance <= 0 ? paymentTimestamp : null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (nonceRef) {
        transaction.update(nonceRef, {
          used: true,
          usedAt: FieldValue.serverTimestamp(),
          transactionId,
        });
      }

      return {
        transactionId,
        borrowerId,
        amountMinor: Math.round(input.amount * 100),
        remainingBalanceMinor: Math.round(nextBalance * 100),
        alreadyRecorded: false,
      };
    });

    if (!recorded) {
      return null;
    }

    this.paymentsService.invalidateLenderCache(lenderId);
    const details = await this.ledgerDetailsService.get(lenderId, loanId);

    if (recorded.alreadyRecorded) {
      return details;
    }

    await this.paymentReceivedNotifier
      .sendForRecordedPayment({
        ...recorded,
        lenderId,
        loanId,
        paidAt,
      })
      .catch((error: unknown) => {
        this.logger.warn(
          `Payment ${recorded.transactionId} was recorded, but SMS processing failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      });

    return details;
  }

  private normalizeNote(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized.slice(0, 500) : null;
  }
}
