import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../../firebase/firebase.service';
import {
  COLLECTIONS,
  repaymentTransactionIdFor,
} from '../../common/firestore/schema';
import {
  buildLoanAgreement,
  loanAgreementIdFor,
} from '../legal/loan-agreement.builder';
import type { LoanAgreementParty } from '../legal/legal.types';
import { ChatGateway } from '../chat/gateway/chat.gateway';

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
  constructor(
    private readonly firebaseService: FirebaseService,
    @Optional() private readonly gateway?: ChatGateway,
  ) {}

  async approveApplication(
    applicationId: string,
    lenderId: string,
    input: ApproveApplicationInput,
  ): Promise<{ loanId: string; agreementId: string }> {
    this.validateApproval(input);
    const db = this.firebaseService.db;
    const applicationRef = db
      .collection(COLLECTIONS.loanApplications)
      .doc(applicationId);
    const loanRef = db.collection(COLLECTIONS.loans).doc();
    let result = {
      loanId: loanRef.id,
      agreementId: loanAgreementIdFor(loanRef.id, 1),
    };
    let approvedBorrowerId = '';
    let created = false;

    await db.runTransaction(async (transaction) => {
      const applicationSnapshot = await transaction.get(applicationRef);
      if (!applicationSnapshot.exists) {
        throw new NotFoundException(`Application ${applicationId} not found.`);
      }

      const application = applicationSnapshot.data() ?? {};
      if (application.convertedLoanId) {
        const existingLoanId = String(application.convertedLoanId);
        result = {
          loanId: existingLoanId,
          agreementId: loanAgreementIdFor(existingLoanId, 1),
        };
        return;
      }
      if (
        ![
          'open',
          'pending',
          'submitted',
          'under_review',
          'matched',
          'pending_kyc',
          'approved',
        ].includes(String(application.status).toLowerCase())
      ) {
        throw new ConflictException(
          `Application in ${String(application.status)} state cannot create a loan.`,
        );
      }
      const listingId = String(application.listingId ?? '');
      const borrowerId = String(application.borrowerId ?? '');
      approvedBorrowerId = borrowerId;
      if (!listingId || !borrowerId) {
        throw new BadRequestException(
          'Application listing and borrower references are required.',
        );
      }
      const [listingSnapshot, lenderSnapshot, borrowerSnapshot] =
        await Promise.all([
          transaction.get(
            db.collection(COLLECTIONS.loanListings).doc(listingId),
          ),
          transaction.get(db.collection(COLLECTIONS.users).doc(lenderId)),
          transaction.get(db.collection(COLLECTIONS.users).doc(borrowerId)),
        ]);
      if (!listingSnapshot.exists) {
        throw new NotFoundException(
          'The application listing no longer exists.',
        );
      }
      if (!lenderSnapshot.exists || !borrowerSnapshot.exists) {
        throw new NotFoundException('A loan participant no longer exists.');
      }
      const listing = listingSnapshot.data() ?? {};
      const matchedLenders = Array.isArray(application.matchedLenderIds)
        ? application.matchedLenderIds
        : [];
      if (
        application.lenderId !== lenderId &&
        listing.lenderId !== lenderId &&
        !matchedLenders.includes(lenderId)
      ) {
        throw new NotFoundException(`Application ${applicationId} not found.`);
      }
      this.validateAgainstListing(input, listing);

      const principal = Math.trunc(input.approvedPrincipalMinor);
      const interest = Math.round(
        principal *
          (input.annualInterestRate / 100) *
          (input.approvedTenureMonths / 12),
      );
      const total = principal + interest;
      const baseInstallment = Math.floor(total / input.approvedTenureMonths);
      const now = Timestamp.now();
      const agreementId = result.agreementId;
      const agreementRef = db.collection('loanAgreements').doc(agreementId);
      const terms = {
        currency: 'LKR' as const,
        principalMinor: principal,
        annualInterestRate: input.annualInterestRate,
        interestAmountMinor: interest,
        totalRepayableMinor: total,
        monthlyInstallmentMinor: baseInstallment,
        tenureMonths: input.approvedTenureMonths,
        repaymentFrequency: 'monthly' as const,
        repaymentStartRule: 'one_month_after_activation' as const,
      };
      const agreement = buildLoanAgreement({
        agreementId,
        loanId: loanRef.id,
        applicationId,
        listingId,
        version: 1,
        borrower: this.toAgreementParty(
          borrowerSnapshot.data() ?? {},
          borrowerId,
          'borrower',
        ),
        lender: this.toAgreementParty(
          lenderSnapshot.data() ?? {},
          lenderId,
          'lender',
        ),
        terms,
        generatedByUserId: lenderId,
        generatedByRole: 'lender',
        now,
      });

      transaction.set(loanRef, {
        loanId: loanRef.id,
        applicationId,
        listingId,
        lenderId,
        borrowerId,
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
        firstPaymentDueAt: null,
        maturityDate: null,
        completedAt: null,
        termsVersion: 1,
        currentAgreementId: agreementId,
        agreementStatus: 'awaiting_signatures',
        createdAt: now,
        updatedAt: now,
      });
      transaction.set(agreementRef, agreement);

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

      transaction.set(
        db
          .collection('borrowerNotifications')
          .doc(`agreement-created-${applicationId}`),
        {
          borrowerId,
          category: 'agreement',
          severity: 'info',
          title: 'Loan agreement created',
          message:
            'Your application was approved. The lender must sign and confirm the external transfer before you can sign.',
          isRead: false,
          relatedEntityType: 'loanAgreement',
          relatedEntityId: agreementId,
          actionTarget: 'Agreement',
          metadata: {
            agreementId,
            loanId: loanRef.id,
            status: 'awaiting_signatures',
          },
          createdAt: now,
          updatedAt: now,
          readAt: null,
        },
      );
      transaction.set(
        db
          .collection('notifications')
          .doc(`agreement-created-${applicationId}-${lenderId}`),
        {
          userId: lenderId,
          category: 'agreement',
          eventType: 'created',
          title: 'Agreement ready to sign',
          body: 'The approved loan agreement is ready for your signature.',
          severity: 'info',
          isRead: false,
          createdAt: now,
          readAt: null,
          entityType: 'loanAgreement',
          entityId: agreementId,
          actionLabel: 'Open agreement',
          actionTarget: 'agreements',
          metadata: {
            agreementId,
            loanId: loanRef.id,
            status: 'awaiting_signatures',
          },
        },
      );
      created = true;
    });

    if (!created) {
      return result;
    }

    const notificationTime = Timestamp.now();
    const realtimePayload = {
      agreementId: result.agreementId,
      loanId: result.loanId,
      status: 'awaiting_signatures',
      changeType: 'created',
      updatedAt: notificationTime.toDate().toISOString(),
    };
    this.gateway?.emitToUser(lenderId, 'agreement:changed', realtimePayload);
    this.gateway?.emitToUser(
      approvedBorrowerId,
      'agreement:changed',
      realtimePayload,
    );
    return result;
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
      if (ledgerSnapshot.exists) {
        resultingStatus = String(loan.status ?? 'active');
        return;
      }
      if (installment.status === 'paid') {
        throw new ConflictException(
          'This monthly installment is paid but its ledger entry is missing.',
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
        platformFeeMinor: Math.round(amount * 0.02),
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

  private validateAgainstListing(
    input: ApproveApplicationInput,
    listing: Record<string, unknown>,
  ): void {
    const minAmount = Number(listing.minAmountMinor ?? 0);
    const maxAmount = Number(listing.maxAmountMinor ?? Number.MAX_SAFE_INTEGER);
    const minRate = Number(listing.minInterestRateAnnual ?? 0);
    const maxRate = Number(listing.maxInterestRateAnnual ?? 100);
    const minTenure = Number(listing.minTenureMonths ?? 1);
    const maxTenure = Number(listing.maxTenureMonths ?? 120);
    if (
      input.approvedPrincipalMinor < minAmount ||
      input.approvedPrincipalMinor > maxAmount
    ) {
      throw new BadRequestException(
        'Approved principal is outside the listing amount range.',
      );
    }
    if (
      input.annualInterestRate < minRate ||
      input.annualInterestRate > maxRate
    ) {
      throw new BadRequestException(
        'Approved interest rate is outside the listing rate range.',
      );
    }
    if (
      input.approvedTenureMonths < minTenure ||
      input.approvedTenureMonths > maxTenure
    ) {
      throw new BadRequestException(
        'Approved tenure is outside the listing tenure range.',
      );
    }
  }

  private toAgreementParty(
    data: Record<string, unknown>,
    userId: string,
    role: 'borrower' | 'lender',
  ): LoanAgreementParty {
    return {
      userId,
      fullName: typeof data.fullName === 'string' ? data.fullName : 'Unknown',
      email: typeof data.email === 'string' ? data.email : '',
      phone: typeof data.phone === 'string' ? data.phone : '',
      role,
    };
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setUTCMonth(result.getUTCMonth() + months);
    return result;
  }
}
