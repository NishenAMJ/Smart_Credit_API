import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import { createHash } from 'crypto';
import { instanceToPlain } from 'class-transformer';
import { FirebaseService } from '../../../firebase/firebase.service';
import {
  CreateLoanApplicationDto,
  LoanApplicationStatus,
  LoanPurpose,
  RepaymentMethod,
  UpdateLoanApplicationDto,
} from './dto/loan-application.dto';
import { BorrowerProfile, LoanApplication } from '../types/borrower.types';
import { CreditScoreService } from '../credit-score/credit-score.service';

type TimestampLike =
  | FirebaseFirestore.Timestamp
  | Date
  | { toMillis?: () => number; toDate?: () => Date }
  | null
  | undefined;

/**
 * Handles the full lifecycle of borrower loan applications —
 * from draft creation through submission and deletion.
 */
@Injectable()
export class BorrowerApplicationsService {
  private readonly BORROWERS_COL = 'users';
  private readonly LOAN_APPS_COL = 'loanApplications';

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly creditScoreService: CreditScoreService,
  ) {}

  private get db() {
    return this.firebaseService.db;
  }

  private removeUndefinedDeep<T>(value: T): T {
    if (Array.isArray(value)) {
      return value
        .map((item) => this.removeUndefinedDeep(item))
        .filter((item) => item !== undefined) as T;
    }

    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [
          key,
          this.removeUndefinedDeep(entryValue),
        ]);

      return Object.fromEntries(entries) as T;
    }

    return value;
  }

  private timestampToMillis(value: TimestampLike): number {
    if (!value) {
      return 0;
    }

    if ('toMillis' in value && typeof value.toMillis === 'function') {
      return value.toMillis();
    }

    if ('toDate' in value && typeof value.toDate === 'function') {
      return value.toDate().getTime();
    }

    if (value instanceof Date) {
      return value.getTime();
    }

    return 0;
  }

  /**
   * Creates a canonical application after confirming KYC and listing terms.
   * Public application requests are submitted in the same write so a client
   * cannot report success while leaving a lender-invisible draft behind.
   */
  async createLoanApplication(
    dto: CreateLoanApplicationDto,
    options: { submitImmediately?: boolean } = {},
  ): Promise<LoanApplication> {
    const plainDto = this.removeUndefinedDeep(
      instanceToPlain(dto) as CreateLoanApplicationDto,
    );

    const profileDoc = await this.db
      .collection(this.BORROWERS_COL)
      .doc(plainDto.borrowerId)
      .get();

    if (!profileDoc.exists) {
      throw new NotFoundException(
        `Borrower profile not found. Please complete your profile first.`,
      );
    }

    const profile = profileDoc.data() as BorrowerProfile & {
      kycStatus?: string;
      borrowerProfile?: { creditScore?: number | null } | null;
    };
    if (profile.kycStatus !== 'approved') {
      throw new ForbiddenException(
        'KYC verification required before submitting a loan application.',
      );
    }

    if (!plainDto.adId) {
      throw new BadRequestException('A lender listing is required.');
    }
    const listing = await this.db
      .collection('loanListings')
      .doc(plainDto.adId)
      .get();
    if (!listing.exists || listing.get('status') !== 'active') {
      throw new BadRequestException(
        'The selected lender listing is not active.',
      );
    }
    const lenderId = String(listing.get('lenderId') ?? '').trim();
    if (!lenderId) {
      throw new BadRequestException(
        'The selected lender listing has no valid owner.',
      );
    }
    if (lenderId === plainDto.borrowerId) {
      throw new ForbiddenException(
        'You cannot apply to your own lending advertisement.',
      );
    }
    this.validateRequestedTerms(plainDto, listing.data() ?? {});

    const shouldSubmit = options.submitImmediately === true;
    const scoreSummary = shouldSubmit
      ? await this.creditScoreService.getSummary(plainDto.borrowerId)
      : null;
    const now = FieldValue.serverTimestamp();
    const appRef = this.db.collection(this.LOAN_APPS_COL).doc();
    const submissionKey = createHash('sha256')
      .update(`${plainDto.borrowerId}:${plainDto.adId}`)
      .digest('hex');
    const submissionKeyRef = this.db
      .collection('applicationSubmissionKeys')
      .doc(submissionKey);
    const applicationData: Record<string, any> = {
      applicationId: appRef.id,
      listingId: plainDto.adId,
      lenderId,
      borrowerId: plainDto.borrowerId,
      requestedPrincipalMinor: Math.round(plainDto.amount * 100),
      requestedTenureMonths: plainDto.tenureMonths,
      requestedPurpose: plainDto.loanPurpose,
      preferredRepaymentMethod: plainDto.preferredRepaymentMethod,
      purposeDescription: plainDto.purposeDescription ?? '',
      employmentStatus: plainDto.employmentStatus ?? '',
      monthlyIncome: plainDto.monthlyIncome ?? 0,
      preferredInterestRate: plainDto.preferredInterestRate ?? null,
      status: shouldSubmit
        ? LoanApplicationStatus.PENDING
        : LoanApplicationStatus.DRAFT,
      lenderDecision: {
        approvedPrincipalMinor: null,
        annualInterestRate: null,
        approvedTenureMonths: null,
        decisionNote: null,
        decidedAt: null,
      },
      convertedLoanId: null,
      submittedAt: shouldSubmit ? now : null,
      createdAt: now,
      updatedAt: now,
      ...(scoreSummary
        ? {
            smartScore: scoreSummary.score,
            borrowerCreditScore: scoreSummary.score,
            scoreRating: scoreSummary.rating,
            scoreBreakdown: scoreSummary.breakdown,
            scoreSnapshotAt: now,
          }
        : {}),
    };

    let existingApplication: LoanApplication | null = null;
    await this.db.runTransaction(async (transaction) => {
      const keySnapshot = await transaction.get(submissionKeyRef);
      const existingApplicationId = keySnapshot.exists
        ? String(keySnapshot.get('applicationId') ?? '')
        : '';

      if (existingApplicationId) {
        const existingSnapshot = await transaction.get(
          this.db.collection(this.LOAN_APPS_COL).doc(existingApplicationId),
        );
        if (existingSnapshot.exists) {
          const candidate = existingSnapshot.data() as LoanApplication;
          if (
            ![
              LoanApplicationStatus.REJECTED,
              LoanApplicationStatus.CANCELLED,
            ].includes(candidate.status)
          ) {
            existingApplication = candidate;
            return;
          }
        }
      }

      transaction.create(appRef, applicationData);
      transaction.set(submissionKeyRef, {
        applicationId: appRef.id,
        borrowerId: plainDto.borrowerId,
        listingId: plainDto.adId,
        updatedAt: now,
      });
    });

    if (existingApplication) {
      return existingApplication;
    }

    const created = await appRef.get();
    return { ...created.data() } as LoanApplication;
  }

  /**
   * Lists all applications for a borrower, optionally filtered by status.
   */
  async getLoanApplications(
    borrowerId: string,
    status?: LoanApplicationStatus,
  ): Promise<LoanApplication[]> {
    let query = this.db
      .collection(this.LOAN_APPS_COL)
      .where('borrowerId', '==', borrowerId) as FirebaseFirestore.Query;

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    const applications = snapshot.docs.map(
      (doc) => ({ ...doc.data() }) as LoanApplication,
    );

    return applications.sort(
      (a, b) =>
        this.timestampToMillis(b.createdAt) -
        this.timestampToMillis(a.createdAt),
    );
  }

  /**
   * Returns one application after confirming it belongs to the requesting borrower.
   */
  async getLoanApplicationById(
    applicationId: string,
    borrowerId: string,
  ): Promise<LoanApplication> {
    const doc = await this.db
      .collection(this.LOAN_APPS_COL)
      .doc(applicationId)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(
        `Loan application ${applicationId} not found`,
      );
    }

    const application = doc.data() as LoanApplication;

    if (application.borrowerId !== borrowerId) {
      throw new ForbiddenException('Access denied to this loan application');
    }

    return application;
  }

  /**
   * Updates an editable draft application — throws if it has already been submitted.
   */
  async updateLoanApplication(
    applicationId: string,
    borrowerId: string,
    dto: UpdateLoanApplicationDto,
  ): Promise<LoanApplication> {
    const application = await this.getLoanApplicationById(
      applicationId,
      borrowerId,
    );

    if (application.status !== LoanApplicationStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT applications can be edited. Current status: ${application.status}`,
      );
    }

    const plainDto = this.removeUndefinedDeep(
      instanceToPlain(dto) as UpdateLoanApplicationDto,
    );

    const updates: Record<string, unknown> = {};
    if (plainDto.amount !== undefined) {
      updates.requestedPrincipalMinor = Math.round(plainDto.amount * 100);
    }
    if (plainDto.loanPurpose !== undefined) {
      updates.requestedPurpose = plainDto.loanPurpose;
    }
    if (plainDto.purposeDescription !== undefined) {
      updates.purposeDescription = plainDto.purposeDescription;
    }
    if (plainDto.tenureMonths !== undefined) {
      updates.requestedTenureMonths = plainDto.tenureMonths;
    }
    if (plainDto.preferredRepaymentMethod !== undefined) {
      updates.preferredRepaymentMethod = plainDto.preferredRepaymentMethod;
    }

    await this.db
      .collection(this.LOAN_APPS_COL)
      .doc(applicationId)
      .update({
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
      });

    return this.getLoanApplicationById(applicationId, borrowerId);
  }

  /**
   * Permanently deletes a draft application. Submitted ones cannot be deleted.
   */
  async deleteLoanApplication(
    applicationId: string,
    borrowerId: string,
  ): Promise<{ message: string }> {
    const application = await this.getLoanApplicationById(
      applicationId,
      borrowerId,
    );

    if (application.status !== LoanApplicationStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT applications can be deleted.');
    }

    await this.db.collection(this.LOAN_APPS_COL).doc(applicationId).delete();

    return {
      message: `Loan application ${applicationId} deleted successfully`,
    };
  }

  /**
   * Withdraws an application that has not been converted into a loan. Repeated
   * cancellation returns the same canonical state so duplicate taps are safe.
   */
  async cancelLoanApplication(
    applicationId: string,
    borrowerId: string,
  ): Promise<LoanApplication> {
    const applicationRef = this.db
      .collection(this.LOAN_APPS_COL)
      .doc(applicationId);

    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(applicationRef);
      if (!snapshot.exists) {
        throw new NotFoundException(
          `Loan application ${applicationId} not found`,
        );
      }
      const application = snapshot.data() as LoanApplication;
      if (application.borrowerId !== borrowerId) {
        throw new ForbiddenException('Access denied to this loan application');
      }
      if (application.status === LoanApplicationStatus.CANCELLED) return;
      if (
        [
          LoanApplicationStatus.APPROVED,
          LoanApplicationStatus.REJECTED,
          LoanApplicationStatus.FUNDED,
        ].includes(application.status)
      ) {
        throw new BadRequestException(
          `Application in ${application.status} state cannot be cancelled.`,
        );
      }

      transaction.update(applicationRef, {
        status: LoanApplicationStatus.CANCELLED,
        cancelledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return this.getLoanApplicationById(applicationId, borrowerId);
  }

  /**
   * Moves a draft into the lender review queue and refreshes the credit score snapshot.
   */
  async submitLoanApplication(
    applicationId: string,
    borrowerId: string,
  ): Promise<LoanApplication> {
    const application = await this.getLoanApplicationById(
      applicationId,
      borrowerId,
    );

    if (
      [
        LoanApplicationStatus.PENDING,
        LoanApplicationStatus.UNDER_REVIEW,
      ].includes(application.status)
    ) {
      return application;
    }

    if (application.status !== LoanApplicationStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT applications can be submitted. Current status: ${application.status}`,
      );
    }

    const listingId = String(
      (application as unknown as Record<string, unknown>).listingId ?? '',
    );
    const listing = listingId
      ? await this.db.collection('loanListings').doc(listingId).get()
      : null;
    if (!listing?.exists || listing.get('status') !== 'active') {
      throw new BadRequestException(
        'The selected lender listing is no longer active.',
      );
    }
    const rawApplication = application as unknown as Record<string, unknown>;
    this.validateRequestedTerms(
      {
        borrowerId,
        adId: listingId,
        amount: Number(rawApplication.requestedPrincipalMinor) / 100,
        tenureMonths: Number(rawApplication.requestedTenureMonths),
        loanPurpose:
          (rawApplication.requestedPurpose as LoanPurpose) ?? LoanPurpose.OTHER,
        preferredRepaymentMethod: RepaymentMethod.QR_PAYMENT,
      },
      listing.data() ?? {},
    );

    const scoreSummary = await this.creditScoreService.getSummary(borrowerId);

    await this.db.collection(this.LOAN_APPS_COL).doc(applicationId).update({
      status: LoanApplicationStatus.OPEN,
      smartScore: scoreSummary.score,
      borrowerCreditScore: scoreSummary.score,
      scoreRating: scoreSummary.rating,
      scoreBreakdown: scoreSummary.breakdown,
      scoreSnapshotAt: FieldValue.serverTimestamp(),
      submittedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return this.getLoanApplicationById(applicationId, borrowerId);
  }

  private validateRequestedTerms(
    dto: CreateLoanApplicationDto,
    listing: FirebaseFirestore.DocumentData,
  ): void {
    if (
      !Number.isFinite(dto.amount) ||
      dto.amount < 10_000 ||
      dto.amount > 5_000_000
    ) {
      throw new BadRequestException(
        'Requested amount must be between LKR 10,000 and LKR 5,000,000.',
      );
    }
    if (
      !Number.isInteger(dto.tenureMonths) ||
      dto.tenureMonths < 3 ||
      dto.tenureMonths > 60
    ) {
      throw new BadRequestException(
        'Requested tenure must be between 3 and 60 whole months.',
      );
    }

    const requestedMinor = Math.round(dto.amount * 100);
    const minAmountMinor = Number(listing.minAmountMinor);
    const maxAmountMinor = Number(listing.maxAmountMinor);
    const minTenureMonths = Number(listing.minTenureMonths);
    const maxTenureMonths = Number(listing.maxTenureMonths);

    if (Number.isFinite(minAmountMinor) && requestedMinor < minAmountMinor) {
      throw new BadRequestException(
        'Requested amount is below this advertisement minimum.',
      );
    }
    if (Number.isFinite(maxAmountMinor) && requestedMinor > maxAmountMinor) {
      throw new BadRequestException(
        'Requested amount exceeds this advertisement maximum.',
      );
    }
    if (
      Number.isFinite(minTenureMonths) &&
      dto.tenureMonths < minTenureMonths
    ) {
      throw new BadRequestException(
        'Requested tenure is below this advertisement minimum.',
      );
    }
    if (
      Number.isFinite(maxTenureMonths) &&
      dto.tenureMonths > maxTenureMonths
    ) {
      throw new BadRequestException(
        'Requested tenure exceeds this advertisement maximum.',
      );
    }
  }
}
