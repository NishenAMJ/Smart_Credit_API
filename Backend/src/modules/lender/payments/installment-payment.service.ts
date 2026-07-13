import { BadRequestException, Injectable } from '@nestjs/common';
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

@Injectable()
export class InstallmentPaymentService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly paymentsService: PaymentsService,
    private readonly ledgerDetailsService: PaymentLedgerDetailsService,
  ) {}

  async record(
    lenderId: string,
    loanId: string,
    installmentId: string,
    input: RecordInstallmentPaymentInput,
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
    const paymentTimestamp = Timestamp.fromDate(paidAt);
    const note = this.normalizeNote(input.note);

    const recorded = await db.runTransaction(async (transaction) => {
      const [loanSnapshot, installmentSnapshot] = await Promise.all([
        transaction.get(loanRef),
        transaction.get(installmentRef),
      ]);

      if (
        !loanSnapshot.exists ||
        !installmentSnapshot.exists ||
        loanSnapshot.get('lenderId') !== lenderId
      ) {
        return false;
      }

      const loan = loanSnapshot.data() ?? {};
      const installment = installmentSnapshot.data() ?? {};
      const normalizedInstallment = getNormalizedInstallment(installment);
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
      const transactionId = repaymentTransactionIdFor(loanId, installmentId);
      const transactionRef = db.collection('transactions').doc(transactionId);

      transaction.create(transactionRef, {
        transactionId,
        loanId,
        installmentId,
        listingId: readString(loan.listingId),
        amountMinor: Math.round(input.amount * 100),
        currency: 'LKR',
        createdAt: paymentTimestamp,
        completedAt: paymentTimestamp,
        type: 'repayment',
        status: 'completed',
        paymentMethod: 'bank_transfer',
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

      return true;
    });

    if (!recorded) {
      return null;
    }

    this.paymentsService.invalidateLenderCache(lenderId);
    return this.ledgerDetailsService.get(lenderId, loanId);
  }

  private normalizeNote(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized.slice(0, 500) : null;
  }
}
