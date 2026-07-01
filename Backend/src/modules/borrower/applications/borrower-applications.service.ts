import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import { instanceToPlain } from 'class-transformer';
import { FirebaseService } from '../../../firebase/firebase.service';
import {
  CreateLoanApplicationDto,
  LoanApplicationStatus,
  UpdateLoanApplicationDto,
} from '../dto/loan-application.dto';
import {
  BorrowerProfile,
  LoanApplication,
} from '../interfaces/borrower.interface';
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
  private readonly BORROWERS_COL = 'borrowers';
  private readonly LOAN_APPS_COL = 'loanRequests';

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
   * Creates a new draft loan application after confirming KYC status.
   * Snapshots the borrower's current credit score into the document.
   */
  async createLoanApplication(
    dto: CreateLoanApplicationDto,
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

    const profile = profileDoc.data() as BorrowerProfile;
    if (!profile.kycVerified) {
      throw new ForbiddenException(
        'KYC verification required before submitting a loan application.',
      );
    }

    const scoreSummary = await this.creditScoreService.getSummary(
      plainDto.borrowerId,
    );
    const now = FieldValue.serverTimestamp();
    const appRef = this.db.collection(this.LOAN_APPS_COL).doc();

    const applicationData = {
      requestId: appRef.id,
      ...plainDto,
      purpose: plainDto.loanPurpose,
      borrowerName: profile.fullName || 'Unknown',
      borrowerPhotoURL: (profile as any).photoURL || '',
      borrowerRating: (profile as any).rating || 0,
      smartScore: scoreSummary.score,
      borrowerCreditScore: scoreSummary.score,
      scoreRating: scoreSummary.rating,
      scoreBreakdown: scoreSummary.breakdown,
      scoreSnapshotAt: now,
      status: LoanApplicationStatus.DRAFT,
      createdAt: now,
      updatedAt: now,
    };

    await appRef.set(applicationData);

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

    await this.db
      .collection(this.LOAN_APPS_COL)
      .doc(applicationId)
      .update({
        ...plainDto,
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

    if (application.status !== LoanApplicationStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT applications can be submitted. Current status: ${application.status}`,
      );
    }

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
}
