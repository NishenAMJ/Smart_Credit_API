import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import {
  readDate,
  readNumber,
  readString,
} from '../../../firebase/firestore-query.utils';
import type {
  ReceiptSubmissionListItem,
  ReceiptVerificationDecisionInput,
} from './payments.types';
import { PaymentsService } from './payments.service';
import { findNextUnsettledInstallmentId } from './installment-order.utils';

@Injectable()
export class ReceiptVerificationService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly paymentsService: PaymentsService,
  ) {}

  private get db() {
    return this.firebaseService.getDb();
  }

  async listPending(lenderId: string): Promise<{
    submissions: ReceiptSubmissionListItem[];
    count: number;
  }> {
    const snapshot = await this.db
      .collection('transactions')
      .where('lenderId', '==', lenderId)
      .where('status', '==', 'pending_verification')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    const records = snapshot.docs
      .map((doc) => ({ id: doc.id, data: doc.data() }))
      .filter(
        ({ data }) =>
          readString(data.type) === 'repayment' &&
          readString(data.paymentMethod) === 'bank_transfer' &&
          (Boolean(readString(data.receiptDocumentId)) ||
            Boolean(readString(data.paymentProofUrl))),
      );
    const recordsWithReceipts = (
      await Promise.all(
        records.map(async (record) => ({
          ...record,
          receiptDocumentId: await this.resolveReceiptDocumentId(record.data),
        })),
      )
    ).filter(
      (
        record,
      ): record is (typeof records)[number] & { receiptDocumentId: string } =>
        Boolean(record.receiptDocumentId),
    );
    const borrowerIds = [
      ...new Set(
        recordsWithReceipts
          .map(({ data }) => readString(data.borrowerId))
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const users = borrowerIds.length
      ? await this.db.getAll(
          ...borrowerIds.map((id) => this.db.collection('users').doc(id)),
        )
      : [];
    const names = new Map(
      users.map((user) => [
        user.id,
        readString(user.data()?.fullName, user.data()?.name) ?? 'Borrower',
      ]),
    );
    const submissions = recordsWithReceipts
      .map(({ id, data, receiptDocumentId }) => {
        const createdAt = readDate(data.createdAt);
        const borrowerId = readString(data.borrowerId) ?? '';
        return {
          transactionId: id,
          loanId: readString(data.loanId) ?? '',
          installmentId: readString(data.installmentId) ?? '',
          borrowerId,
          borrowerName: names.get(borrowerId) ?? 'Borrower',
          amount: readNumber(data.amountMinor) / 100,
          currency: readString(data.currency) ?? 'LKR',
          receiptDocumentId,
          submittedAt: createdAt?.toISOString() ?? null,
          status: 'pending_verification' as const,
        };
      })
      .filter((item) => item.loanId && item.installmentId)
      .sort(
        (left, right) =>
          new Date(right.submittedAt ?? 0).getTime() -
          new Date(left.submittedAt ?? 0).getTime(),
      );

    return { submissions, count: submissions.length };
  }

  async decide(
    lenderId: string,
    transactionId: string,
    input: ReceiptVerificationDecisionInput,
  ) {
    if (!['approve', 'reject'].includes(input?.decision)) {
      throw new BadRequestException('Decision must be approve or reject.');
    }
    const note = this.normalizeNote(input.note);
    if (input.decision === 'reject' && !note) {
      throw new BadRequestException('A rejection reason is required.');
    }

    const transactionRef = this.db
      .collection('transactions')
      .doc(transactionId);
    const pendingSnapshot = await transactionRef.get();
    if (!pendingSnapshot.exists) {
      throw new NotFoundException('Receipt submission was not found.');
    }
    const pendingPayment = pendingSnapshot.data() ?? {};
    if (readString(pendingPayment.lenderId) !== lenderId) {
      throw new ForbiddenException(
        'This receipt does not belong to your lending account.',
      );
    }
    const resolvedReceiptDocumentId =
      await this.resolveReceiptDocumentId(pendingPayment);

    const result = await this.db.runTransaction(async (transaction) => {
      const transactionSnapshot = await transaction.get(transactionRef);
      if (!transactionSnapshot.exists) {
        throw new NotFoundException('Receipt submission was not found.');
      }
      const payment = transactionSnapshot.data() ?? {};
      if (readString(payment.lenderId) !== lenderId) {
        throw new ForbiddenException(
          'This receipt does not belong to your lending account.',
        );
      }
      if (
        readString(payment.type) !== 'repayment' ||
        readString(payment.paymentMethod) !== 'bank_transfer'
      ) {
        throw new BadRequestException(
          'Only bank-transfer receipt submissions can be reviewed.',
        );
      }
      const currentStatus = readString(payment.status);
      if (currentStatus !== 'pending_verification') {
        throw new BadRequestException(
          `This receipt has already been ${currentStatus ?? 'processed'}.`,
        );
      }

      const loanId = readString(payment.loanId);
      const installmentId = readString(payment.installmentId);
      const repaymentId = readString(payment.repaymentId, payment.paymentId);
      const documentId =
        readString(payment.receiptDocumentId) ?? resolvedReceiptDocumentId;
      if (!loanId || !installmentId || !repaymentId || !documentId) {
        throw new BadRequestException(
          'The receipt submission is missing required payment references.',
        );
      }

      const loanRef = this.db.collection('loans').doc(loanId);
      const installmentRef = loanRef
        .collection('installments')
        .doc(installmentId);
      const repaymentRef = this.db.collection('repayments').doc(repaymentId);
      const documentRef = this.db.collection('documents').doc(documentId);
      const [
        loanSnapshot,
        installmentSnapshot,
        repaymentSnapshot,
        documentSnapshot,
      ] = await Promise.all([
        transaction.get(loanRef),
        transaction.get(installmentRef),
        transaction.get(repaymentRef),
        transaction.get(documentRef),
      ]);

      if (!loanSnapshot.exists || loanSnapshot.get('lenderId') !== lenderId) {
        throw new ForbiddenException('The related loan is not available.');
      }
      if (!installmentSnapshot.exists || !repaymentSnapshot.exists) {
        throw new BadRequestException(
          'The related installment or repayment record is missing.',
        );
      }
      if (
        !documentSnapshot.exists ||
        documentSnapshot.get('userId') !== readString(payment.borrowerId) ||
        documentSnapshot.get('category') !== 'payment_receipt' ||
        documentSnapshot.get('relatedEntityId') !== loanId
      ) {
        throw new BadRequestException(
          'The receipt document does not match this payment.',
        );
      }

      const now = Timestamp.now();
      if (input.decision === 'reject') {
        const review = {
          reviewedAt: now,
          reviewedBy: lenderId,
          rejectionReason: note,
        };
        transaction.update(transactionRef, {
          status: 'rejected',
          receiptDocumentId: documentId,
          verificationStatus: 'rejected',
          verifiedByLender: false,
          reviewedAt: now,
          rejectionReason: note,
          note,
          updatedAt: now,
        });
        transaction.update(repaymentRef, {
          status: 'rejected',
          receiptDocumentId: documentId,
          verificationStatus: 'rejected',
          verifiedByLender: false,
          reviewedAt: now,
          rejectionReason: note,
          updatedAt: now,
        });
        transaction.update(documentRef, {
          status: 'rejected',
          review,
          updatedAt: now,
        });
        return { decision: 'rejected' as const, loanId, transactionId };
      }

      const installmentsSnapshot = await transaction.get(
        loanRef.collection('installments'),
      );
      const nextInstallmentId = findNextUnsettledInstallmentId(
        installmentsSnapshot.docs,
      );
      if (nextInstallmentId && nextInstallmentId !== installmentId) {
        throw new ConflictException(
          'Installments must be paid in order. Approve the earliest unpaid installment first.',
        );
      }

      const loan = loanSnapshot.data() ?? {};
      const installment = installmentSnapshot.data() ?? {};
      const amountMinor = readNumber(payment.amountMinor);
      const amountDueMinor = readNumber(installment.amountDueMinor);
      if (readString(installment.status) === 'paid') {
        throw new BadRequestException('This installment is already paid.');
      }
      if (readString(installment.status) === 'waived') {
        throw new BadRequestException('This installment has been waived.');
      }
      if (amountMinor <= 0 || amountMinor !== amountDueMinor) {
        throw new BadRequestException(
          'The submitted transfer must match the full installment amount.',
        );
      }

      const remainingBalanceMinor = Math.max(
        0,
        readNumber(loan.remainingBalanceMinor) - amountMinor,
      );
      const completed = remainingBalanceMinor === 0;
      transaction.update(transactionRef, {
        status: 'completed',
        receiptDocumentId: documentId,
        verificationStatus: 'approved',
        verifiedByLender: true,
        verifiedByLenderId: lenderId,
        reviewedAt: now,
        completedAt: now,
        paidAt: now,
        note,
        updatedAt: now,
      });
      transaction.update(repaymentRef, {
        status: 'completed',
        receiptDocumentId: documentId,
        verificationStatus: 'approved',
        verifiedByLender: true,
        verifiedByLenderId: lenderId,
        reviewedAt: now,
        paidAt: now,
        updatedAt: now,
      });
      transaction.update(installmentRef, {
        status: 'paid',
        paidTransactionId: transactionId,
        paidAt: now,
        note,
        updatedAt: now,
      });
      transaction.update(loanRef, {
        amountPaidMinor: readNumber(loan.amountPaidMinor) + amountMinor,
        remainingBalanceMinor,
        status: completed ? 'completed' : (readString(loan.status) ?? 'active'),
        completedAt: completed ? now : null,
        updatedAt: now,
      });
      transaction.update(documentRef, {
        status: 'approved',
        review: { reviewedAt: now, reviewedBy: lenderId, notes: note },
        updatedAt: now,
      });
      return { decision: 'approved' as const, loanId, transactionId };
    });

    this.paymentsService.invalidateLenderCache(lenderId);
    return result;
  }

  private normalizeNote(value: string | null | undefined) {
    if (typeof value !== 'string') return null;
    const note = value.trim();
    return note ? note.slice(0, 500) : null;
  }

  private async resolveReceiptDocumentId(
    payment: FirebaseFirestore.DocumentData,
  ): Promise<string | null> {
    const directDocumentId = readString(payment.receiptDocumentId);
    if (directDocumentId) return directDocumentId;

    const paymentProofUrl = readString(payment.paymentProofUrl);
    const loanId = readString(payment.loanId);
    const borrowerId = readString(payment.borrowerId);
    if (!paymentProofUrl || !loanId || !borrowerId) return null;

    const snapshot = await this.db
      .collection('documents')
      .where('relatedEntityId', '==', loanId)
      .get();
    const candidates = snapshot.docs.filter((document) => {
      const data = document.data();
      return (
        readString(data.userId) === borrowerId &&
        readString(data.category) === 'payment_receipt' &&
        readString(data.relatedEntityType) === 'loan' &&
        !['deleted', 'rejected'].includes(readString(data.status) ?? '')
      );
    });
    const exactMatch = candidates.find(
      (document) =>
        readString(document.data().cloudinarySecureUrl) === paymentProofUrl,
    );

    if (exactMatch) return exactMatch.id;
    return candidates.length === 1 ? candidates[0].id : null;
  }
}
