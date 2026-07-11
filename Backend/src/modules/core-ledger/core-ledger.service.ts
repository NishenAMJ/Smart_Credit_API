import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../../firebase/firebase.service';
import {
  COLLECTIONS,
  installmentIdFor,
  repaymentTransactionIdFor,
} from '../../common/firestore/schema';

export interface ApproveApplicationInput {
  approvedPrincipalMinor: number;
  annualInterestRate: number;
  approvedTenureMonths: number;
  decisionNote?: string | null;
}

export interface SettleInstallmentInput {
  paymentMethod: 'bank_transfer' | 'qr' | 'cash' | 'card';
  externalReference?: string | null;
  receiptDocumentId?: string | null;
  note?: string | null;
}

@Injectable()
export class CoreLedgerService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async approveApplication(
    applicationId: string,
    lenderId: string,
    input: ApproveApplicationInput,
  ): Promise<{ loanId: string }> {
    this.validateApproval(input);
    const db = this.firebaseService.db;
    const applicationRef = db
      .collection(COLLECTIONS.loanApplications)
      .doc(applicationId);
    const loanRef = db.collection(COLLECTIONS.loans).doc();

    await db.runTransaction(async (transaction) => {
      const applicationSnapshot = await transaction.get(applicationRef);
      if (!applicationSnapshot.exists) {
        throw new NotFoundException(`Application ${applicationId} not found.`);
      }

      const application = applicationSnapshot.data() ?? {};
      if (application.lenderId !== lenderId) {
        throw new NotFoundException(`Application ${applicationId} not found.`);
      }
      if (
        !['submitted', 'under_review', 'approved'].includes(application.status)
      ) {
        throw new ConflictException(
          `Application in ${String(application.status)} state cannot create a loan.`,
        );
      }
      if (application.convertedLoanId) {
        throw new ConflictException('Application already has a loan.');
      }

      const principal = Math.trunc(input.approvedPrincipalMinor);
      const interest = Math.round(
        principal *
          (input.annualInterestRate / 100) *
          (input.approvedTenureMonths / 12),
      );
      const total = principal + interest;
      const baseInstallment = Math.floor(total / input.approvedTenureMonths);
      const now = Timestamp.now();
      const firstDue = this.addMonths(now.toDate(), 1);

      transaction.set(loanRef, {
        loanId: loanRef.id,
        applicationId,
        listingId: application.listingId,
        lenderId,
        borrowerId: application.borrowerId,
        currency: 'LKR',
        principalMinor: principal,
        annualInterestRate: input.annualInterestRate,
        interestAmountMinor: interest,
        totalRepayableMinor: total,
        monthlyInstallmentMinor: baseInstallment,
        tenureMonths: input.approvedTenureMonths,
        amountPaidMinor: 0,
        remainingBalanceMinor: total,
        status: 'pending_disbursement',
        approvedAt: now,
        disbursedAt: null,
        firstPaymentDueAt: Timestamp.fromDate(firstDue),
        maturityDate: Timestamp.fromDate(
          this.addMonths(firstDue, input.approvedTenureMonths - 1),
        ),
        completedAt: null,
        termsVersion: 1,
        createdAt: now,
        updatedAt: now,
      });

      for (
        let sequence = 1;
        sequence <= input.approvedTenureMonths;
        sequence += 1
      ) {
        const installmentId = installmentIdFor(sequence);
        const amountDue =
          sequence === input.approvedTenureMonths
            ? total - baseInstallment * (input.approvedTenureMonths - 1)
            : baseInstallment;
        transaction.set(
          loanRef.collection(COLLECTIONS.installments).doc(installmentId),
          {
            installmentId,
            loanId: loanRef.id,
            lenderId,
            borrowerId: application.borrowerId,
            sequence,
            currency: 'LKR',
            amountDueMinor: amountDue,
            status: 'scheduled',
            dueAt: Timestamp.fromDate(this.addMonths(firstDue, sequence - 1)),
            paidTransactionId: null,
            paidAt: null,
            note: null,
            createdAt: now,
            updatedAt: now,
          },
        );
      }

      transaction.update(applicationRef, {
        status: 'converted',
        convertedLoanId: loanRef.id,
        lenderDecision: {
          approvedPrincipalMinor: principal,
          annualInterestRate: input.annualInterestRate,
          approvedTenureMonths: input.approvedTenureMonths,
          decisionNote: input.decisionNote?.trim() || null,
          decidedAt: now,
        },
        updatedAt: now,
      });
    });

    return { loanId: loanRef.id };
  }

  async settleInstallment(
    loanId: string,
    installmentId: string,
    borrowerId: string,
    input: SettleInstallmentInput,
  ): Promise<{ transactionId: string; loanStatus: string }> {
    if (
      !['bank_transfer', 'qr', 'cash', 'card'].includes(input.paymentMethod)
    ) {
      throw new BadRequestException('A valid paymentMethod is required.');
    }
    const db = this.firebaseService.db;
    const loanRef = db.collection(COLLECTIONS.loans).doc(loanId);
    const installmentRef = loanRef
      .collection(COLLECTIONS.installments)
      .doc(installmentId);
    const transactionId = repaymentTransactionIdFor(loanId, installmentId);
    const ledgerRef = db
      .collection(COLLECTIONS.transactions)
      .doc(transactionId);

    let resultingStatus = 'active';
    await db.runTransaction(async (transaction) => {
      const [loanSnapshot, installmentSnapshot, ledgerSnapshot] =
        await Promise.all([
          transaction.get(loanRef),
          transaction.get(installmentRef),
          transaction.get(ledgerRef),
        ]);

      if (!loanSnapshot.exists || !installmentSnapshot.exists) {
        throw new NotFoundException('Loan or installment not found.');
      }
      const loan = loanSnapshot.data() ?? {};
      const installment = installmentSnapshot.data() ?? {};
      if (loan.borrowerId !== borrowerId) {
        throw new NotFoundException('Loan or installment not found.');
      }
      if (ledgerSnapshot.exists || installment.status === 'paid') {
        throw new ConflictException(
          'This monthly installment is already paid.',
        );
      }
      if (!['active', 'overdue'].includes(loan.status)) {
        throw new ConflictException(
          `Loan in ${String(loan.status)} state cannot accept repayment.`,
        );
      }

      const amount = Number(installment.amountDueMinor);
      const remaining = Math.max(
        0,
        Number(loan.remainingBalanceMinor) - amount,
      );
      const paid = Number(loan.amountPaidMinor) + amount;
      resultingStatus = remaining === 0 ? 'completed' : 'active';
      const now = Timestamp.now();

      transaction.create(ledgerRef, {
        transactionId,
        type: 'repayment',
        status: 'completed',
        currency: 'LKR',
        amountMinor: amount,
        lenderId: loan.lenderId,
        borrowerId,
        loanId,
        installmentId,
        listingId: loan.listingId,
        paymentMethod: input.paymentMethod,
        externalReference: input.externalReference?.trim() || null,
        idempotencyKey: transactionId,
        receiptDocumentId: input.receiptDocumentId?.trim() || null,
        note: input.note?.trim() || null,
        initiatedByUserId: borrowerId,
        completedAt: now,
        createdAt: now,
      });
      transaction.update(installmentRef, {
        status: 'paid',
        paidTransactionId: transactionId,
        paidAt: now,
        note: input.note?.trim() || null,
        updatedAt: now,
      });
      transaction.update(loanRef, {
        amountPaidMinor: paid,
        remainingBalanceMinor: remaining,
        status: resultingStatus,
        completedAt: remaining === 0 ? now : null,
        updatedAt: now,
      });
    });

    return { transactionId, loanStatus: resultingStatus };
  }

  private validateApproval(input: ApproveApplicationInput): void {
    if (
      !Number.isSafeInteger(input.approvedPrincipalMinor) ||
      input.approvedPrincipalMinor <= 0
    ) {
      throw new BadRequestException(
        'approvedPrincipalMinor must be a positive integer.',
      );
    }
    if (
      !Number.isFinite(input.annualInterestRate) ||
      input.annualInterestRate < 0 ||
      input.annualInterestRate > 100
    ) {
      throw new BadRequestException(
        'annualInterestRate must be between 0 and 100.',
      );
    }
    if (
      !Number.isInteger(input.approvedTenureMonths) ||
      input.approvedTenureMonths < 1 ||
      input.approvedTenureMonths > 120
    ) {
      throw new BadRequestException(
        'approvedTenureMonths must be between 1 and 120.',
      );
    }
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setUTCMonth(result.getUTCMonth() + months);
    return result;
  }
}
