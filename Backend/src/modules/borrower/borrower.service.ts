import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { CreateBorrowerProfileDto } from './dto/create-profile.dto';
import { UpdateBorrowerProfileDto } from './dto/update-profile.dto';
import {
  CreateLoanApplicationDto,
  UpdateLoanApplicationDto,
  LoanApplicationStatus,
} from './dto/loan-application.dto';
import { MakeRepaymentDto } from './dto/make-repayment.dto';
import {
  BorrowerProfile,
  LoanApplication,
  Loan,
  LoanStatus,
  Repayment,
  RepaymentStatus,
  BorrowerDashboard,
} from './interfaces/borrower.interface';
import { FieldValue } from 'firebase-admin/firestore';
import { instanceToPlain } from 'class-transformer';
import { BORROWER_DEFAULTS, BORROWER_FLOW } from './borrower.constants';

type TimestampLike =
  | FirebaseFirestore.Timestamp
  | Date
  | { toMillis?: () => number; toDate?: () => Date }
  | null
  | undefined;

@Injectable()
export class BorrowerService {
  // Firestore collection names used by borrower workflows.
  private readonly BORROWERS_COL = 'borrowers';
  private readonly LOAN_APPS_COL = 'loanRequests';

  private readonly LOANS_COL = 'loans';
  private readonly REPAYMENTS_COL = 'repayments';

  constructor(private readonly firebaseService: FirebaseService) {}

  private get db() {
    return this.firebaseService.db;
  }

  // ==================== DASHBOARD ====================

  async getDashboard(borrowerId: string) {
    if (!borrowerId) {
      throw new BadRequestException('Borrower ID is required');
    }

    try {
      const userDoc = await this.db.collection('users').doc(borrowerId).get();
      const profileData = userDoc.exists ? userDoc.data() : {};

      const loansSnapshot = await this.db
        .collection('loans')
        .where('borrowerId', '==', borrowerId)
        .where('status', '==', 'active')
        .get();

      let activeLoansCount = 0;
      let totalOutstanding = 0;
      let nextPaymentAmount = 0;
      let nextPaymentDate = null;

      loansSnapshot.forEach((doc) => {
        activeLoansCount++;
        const loan = doc.data();
        totalOutstanding += loan.outstandingBalance || 0;
        
        if (!nextPaymentDate && loan.nextDueDate) {
          nextPaymentDate = loan.nextDueDate;
          nextPaymentAmount = loan.monthlyInstallment || 0;
        }
      });

      const appsSnapshot = await this.db
        .collection('loanRequests')
        .where('borrowerId', '==', borrowerId)
        .where('status', 'in', ['pending', 'PENDING', 'draft', 'DRAFT'])
        .get();

      const dashboard = {
        profile: profileData,
        activeLoans: activeLoansCount,
        pendingApplications: appsSnapshot.size,
        totalOutstanding,
        nextPaymentDate,
        nextPaymentAmount,
        creditScore: profileData?.creditScore || 0,
        totalBorrowed: profileData?.totalBorrowed || 0,
        totalRepaid: profileData?.totalRepaid || 0,
      };

      return {
        statusCode: 200,
        message: 'Dashboard data retrieved successfully',
        data: dashboard,
      };
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      throw new InternalServerErrorException('Failed to fetch dashboard data');
    }
  }

  async getMyLoans(borrowerId: string, status?: string) {
    if (!borrowerId) {
      throw new BadRequestException('Borrower ID is required');
    }

    try {
      let query: any = this.db
        .collection('loans')
        .where('borrowerId', '==', borrowerId);

      if (status) {
        query = query.where('status', '==', status);
      }

      const snapshot = await query.get();
      const loans = snapshot.docs.map((doc) => ({
        loanId: doc.id,
        ...doc.data(),
      }));

      return {
        statusCode: 200,
        message: 'Loans retrieved successfully',
        total: loans.length,
        data: loans,
      };
    } catch (error) {
      console.error('Error fetching loans:', error);
      throw new InternalServerErrorException('Failed to fetch loans');
    }
  }

  private removeUndefinedDeep<T>(value: T): T {
    // Firestore rejects undefined values, so recursively strip them from payloads.
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
    // Normalize Firestore timestamps and Date values for stable sorting.
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
   * Batch-fetches lender display names from the borrowers collection.
   * Returns a Map of lenderId → fullName.
   */
  async getLenderNamesMap(lenderIds: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(lenderIds.filter(Boolean))];
    const nameMap = new Map<string, string>();

    if (unique.length === 0) return nameMap;

    // Firestore `in` queries support max 30 values; chunk if needed.
    const chunks: string[][] = [];
    for (let i = 0; i < unique.length; i += 30) {
      chunks.push(unique.slice(i, i + 30));
    }

    for (const chunk of chunks) {
      const snapshot = await this.db
        .collection(this.BORROWERS_COL)
        .where('userId', 'in', chunk)
        .get();

      for (const doc of snapshot.docs) {
        const data = doc.data() as BorrowerProfile;
        nameMap.set(data.userId, data.fullName ?? 'Lender');
      }
    }

    return nameMap;
  }

  /**
   * Creates a new borrower profile after preventing duplicate user records.
   */
  async createProfile(dto: CreateBorrowerProfileDto): Promise<BorrowerProfile> {
    const plainDto = this.removeUndefinedDeep(
      instanceToPlain(dto) as CreateBorrowerProfileDto,
    );

    // Check if profile already exists for this user
    const existing = await this.db
      .collection(this.BORROWERS_COL)
      .doc(plainDto.userId)
      .get();

    if (existing.exists) {
      throw new ConflictException(
        `Borrower profile already exists for user ${dto.userId}`,
      );
    }

    const now = FieldValue.serverTimestamp();
    const profileData: Omit<BorrowerProfile, 'createdAt' | 'updatedAt'> & {
      createdAt: FieldValue;
      updatedAt: FieldValue;
    } = {
      ...plainDto,
      creditScore: BORROWER_DEFAULTS.STARTING_CREDIT_SCORE,
      profileComplete: true,
      kycVerified: false,
      totalLoans: 0,
      activeLoans: 0,
      totalBorrowed: 0,
      totalRepaid: 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.db
      .collection(this.BORROWERS_COL)
      .doc(plainDto.userId)
      .set(profileData);

    const created = await this.db
      .collection(this.BORROWERS_COL)
      .doc(plainDto.userId)
      .get();

    return { ...created.data() } as BorrowerProfile;
  }

  async getProfile(userId: string): Promise<BorrowerProfile> {
    const doc = await this.db.collection(this.BORROWERS_COL).doc(userId).get();

    if (!doc.exists) {
      throw new NotFoundException(
        `Borrower profile not found for user ${userId}`,
      );
    }

    return { userId: doc.id, ...doc.data() } as BorrowerProfile;
  }

  async updateProfile(
    userId: string,
    dto: UpdateBorrowerProfileDto,
  ): Promise<BorrowerProfile> {
    const doc = await this.db.collection(this.BORROWERS_COL).doc(userId).get();

    if (!doc.exists) {
      throw new NotFoundException(
        `Borrower profile not found for user ${userId}`,
      );
    }

    const updateData = {
      ...this.removeUndefinedDeep(
        instanceToPlain(dto) as UpdateBorrowerProfileDto,
      ),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await this.db.collection(this.BORROWERS_COL).doc(userId).update(updateData);

    return this.getProfile(userId);
  }

  /**
   * Creates a new draft loan application for a KYC-verified borrower.
   */
  async createLoanApplication(
    dto: CreateLoanApplicationDto,
  ): Promise<LoanApplication> {
    const plainDto = this.removeUndefinedDeep(
      instanceToPlain(dto) as CreateLoanApplicationDto,
    );

    // Verify borrower profile exists
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

    const now = FieldValue.serverTimestamp();
    const appRef = this.db.collection(this.LOAN_APPS_COL).doc();

    const applicationData = {
      requestId: appRef.id,
      ...plainDto,

      // Denormalized fields for Mahinsa's Lender UI
      borrowerName: profile.fullName || 'Unknown',
      borrowerPhotoURL: (profile as any).photoURL || '',
      borrowerRating: (profile as any).rating || 0,
      smartScore: profile.creditScore || 0,
      borrowerCreditScore: profile.creditScore || 0,

      // Status as lowercase to match Mahinsa's schema
      status: LoanApplicationStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    };

    await appRef.set(applicationData);

    const created = await appRef.get();
    return { ...created.data() } as LoanApplication;
  }

  /**
   * Lists borrower loan applications, optionally filtered by application status.
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
   * Returns one loan application after confirming borrower ownership.
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

    // Ensure the application belongs to the requesting borrower
    if (application.borrowerId !== borrowerId) {
      throw new ForbiddenException('Access denied to this loan application');
    }

    return application;
  }

  /**
   * Updates an editable draft loan application.
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
   * Deletes a draft application before it enters review.
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
   * Moves a draft application into the lender review queue.
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

    await this.db.collection(this.LOAN_APPS_COL).doc(applicationId).update({
      status: LoanApplicationStatus.PENDING,
      submittedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return this.getLoanApplicationById(applicationId, borrowerId);
  }

  /**
   * Gets borrower loans, optionally filtered by loan status.
   */
  async getLoans(borrowerId: string, status?: LoanStatus): Promise<Loan[]> {
    let query = this.db
      .collection(this.LOANS_COL)
      .where('borrowerId', '==', borrowerId) as FirebaseFirestore.Query;

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    const loans = snapshot.docs.map((doc) => ({ ...doc.data() }) as Loan);

    return loans.sort(
      (a, b) =>
        this.timestampToMillis(b.createdAt) -
        this.timestampToMillis(a.createdAt),
    );
  }

  /**
   * Returns one loan after confirming borrower ownership.
   */
  async getLoanById(loanId: string, borrowerId: string): Promise<Loan> {
    const doc = await this.db.collection(this.LOANS_COL).doc(loanId).get();

    if (!doc.exists) {
      throw new NotFoundException(`Loan ${loanId} not found`);
    }

    const loan = doc.data() as Loan;

    if (loan.borrowerId !== borrowerId) {
      throw new ForbiddenException('Access denied to this loan');
    }

    return loan;
  }

  /**
   * Calculates the full repayment schedule and marks paid or overdue items.
   */
  async getRepaymentSchedule(
    loanId: string,
    borrowerId: string,
  ): Promise<
    Array<{
      installmentNumber: number;
      dueDate: Date;
      principalAmount: number;
      interestAmount: number;
      totalAmount: number;
      remainingBalance: number;
      status: string;
    }>
  > {
    const loan = await this.getLoanById(loanId, borrowerId);

    // Fetch already-made repayments to mark completed installments
    const repaymentSnapshot = await this.db
      .collection(this.REPAYMENTS_COL)
      .where('loanId', '==', loanId)
      .orderBy('installmentNumber', 'asc')
      .get();

    const paidInstallments = new Set(
      repaymentSnapshot.docs
        .filter((d) => d.data().status === RepaymentStatus.COMPLETED)
        .map((d) => d.data().installmentNumber as number),
    );

    // Amortization schedule calculation
    const monthlyRate = loan.interestRate / 100 / 12;
    const principal = loan.loanAmount;
    const term = loan.loanTermMonths;

    const disbursedAt =
      loan.startDate instanceof Date
        ? loan.startDate
        : loan.startDate.toDate();

    const schedule: Array<{
      installmentNumber: number;
      dueDate: Date;
      principalAmount: number;
      interestAmount: number;
      totalAmount: number;
      remainingBalance: number;
      status: string;
    }> = [];
    let remainingBalance = principal;

    for (let i = 1; i <= term; i++) {
      const interestAmount = remainingBalance * monthlyRate;
      const principalAmount = loan.monthlyInstallment - interestAmount;
      remainingBalance = Math.max(0, remainingBalance - principalAmount);

      const dueDate = new Date(disbursedAt);
      dueDate.setMonth(dueDate.getMonth() + i);

      const now = new Date();
      let status = 'upcoming';
      if (paidInstallments.has(i)) {
        status = 'paid';
      } else if (dueDate < now) {
        status = 'overdue';
      }

      schedule.push({
        installmentNumber: i,
        dueDate,
        principalAmount: Math.round(principalAmount * 100) / 100,
        interestAmount: Math.round(interestAmount * 100) / 100,
        totalAmount: loan.monthlyInstallment,
        remainingBalance: Math.round(remainingBalance * 100) / 100,
        status,
      });
    }

    return schedule;
  }

  /**
   * Records a repayment and updates loan and borrower totals atomically.
   */
  async makeRepayment(dto: MakeRepaymentDto): Promise<Repayment> {
    const loan = await this.getLoanById(dto.loanId, dto.borrowerId);

    if (loan.status === LoanStatus.COMPLETED) {
      throw new BadRequestException('This loan is already fully repaid.');
    }
    if (loan.status === LoanStatus.CANCELLED) {
      throw new BadRequestException('Cannot repay a cancelled loan.');
    }
    if (dto.amount <= 0) {
      throw new BadRequestException('Repayment amount must be greater than 0.');
    }
    if (dto.amount > loan.outstandingBalance) {
      throw new BadRequestException(
        `Repayment amount (LKR ${dto.amount}) exceeds outstanding balance (LKR ${loan.outstandingBalance}).`,
      );
    }

    const now = FieldValue.serverTimestamp();
    const repaymentRef = this.db.collection(this.REPAYMENTS_COL).doc();

    // Calculate principal vs interest split
    const monthlyRate = loan.interestRate / 100 / 12;
    const interestPaid =
      Math.round(loan.outstandingBalance * monthlyRate * 100) / 100;
    const principalPaid = Math.round((dto.amount - interestPaid) * 100) / 100;

    const newOutstanding = Math.max(
      0,
      Math.round((loan.outstandingBalance - principalPaid) * 100) / 100,
    );

    const installmentNumber = loan.repaymentsMade + 1;

    const repaymentData = {
      repaymentId: repaymentRef.id,
      loanId: dto.loanId,
      borrowerId: dto.borrowerId,
      lenderId: loan.lenderId,
      amount: dto.amount,
      principalPaid,
      interestPaid,
      paymentMethod: dto.paymentMethod,
      transactionReference: dto.transactionReference ?? null,
      paymentProofUrl: dto.paymentProofUrl ?? null,
      status: RepaymentStatus.COMPLETED,
      dueDate: loan.nextPaymentDate,
      paidAt: now,
      installmentNumber,
      createdAt: now,
    };

    // Use a batch write for atomicity
    const batch = this.db.batch();

    batch.set(repaymentRef, repaymentData);

    const isFullyRepaid = newOutstanding === 0;
    const nextPaymentDate = new Date();
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

    // Keep loan progress and borrower aggregates in sync in the same batch.
    batch.update(this.db.collection(this.LOANS_COL).doc(dto.loanId), {
      outstandingBalance: newOutstanding,
      repaymentsMade: FieldValue.increment(1),
      status: isFullyRepaid ? LoanStatus.COMPLETED : loan.status,
      nextPaymentDate: isFullyRepaid ? null : nextPaymentDate,
      updatedAt: now,
    });

    // Update borrower's totalRepaid
    batch.update(this.db.collection(this.BORROWERS_COL).doc(dto.borrowerId), {
      totalRepaid: FieldValue.increment(dto.amount),
      activeLoans: isFullyRepaid
        ? FieldValue.increment(-1)
        : FieldValue.increment(0),
      updatedAt: now,
    });

    await batch.commit();

    const created = await repaymentRef.get();
    return { ...created.data() } as Repayment;
  }

  /**
   * Gets all repayments made for a borrower-owned loan.
   */
  async getRepaymentHistory(
    loanId: string,
    borrowerId: string,
  ): Promise<Repayment[]> {
    // Verify loan ownership
    await this.getLoanById(loanId, borrowerId);

    const snapshot = await this.db
      .collection(this.REPAYMENTS_COL)
      .where('loanId', '==', loanId)
      .get();

    const repayments = snapshot.docs.map(
      (doc) => ({ ...doc.data() }) as Repayment,
    );

    return repayments.sort(
      (a, b) =>
        this.timestampToMillis(b.createdAt) -
        this.timestampToMillis(a.createdAt),
    );
  }

  /**
   * Returns aggregated borrower profile, loan, and recent activity data.
   */
  async getDashboard(userId: string): Promise<BorrowerDashboard> {
    const profile = await this.getProfile(userId);

    // Fetch active loans
    const activeLoansSnapshot = await this.db
      .collection(this.LOANS_COL)
      .where('borrowerId', '==', userId)
      .where('status', '==', LoanStatus.ACTIVE)
      .get();

    // Fetch pending applications
    const pendingAppsSnapshot = await this.db
      .collection(this.LOAN_APPS_COL)
      .where('borrowerId', '==', userId)
      .where('status', 'in', [
        LoanApplicationStatus.PENDING,
        LoanApplicationStatus.UNDER_REVIEW,
      ])
      .get();

    const activeLoans = activeLoansSnapshot.docs.map((d) => d.data() as Loan);

    const totalOutstanding = activeLoans.reduce(
      (sum, loan) => sum + loan.outstandingBalance,
      0,
    );

    // Find the nearest next payment
    const sortedByNextPayment = [...activeLoans].sort((a, b) => {
      const aDate = a.nextPaymentDate?.toDate?.() ?? new Date(0);
      const bDate = b.nextPaymentDate?.toDate?.() ?? new Date(0);
      return aDate.getTime() - bDate.getTime();
    });

    const nextLoan = sortedByNextPayment[0];

    // Recent activity (last 5 repayments)
    const recentRepaymentsSnapshot = await this.db
      .collection(this.REPAYMENTS_COL)
      .where('borrowerId', '==', userId)
      .get();

    const recentRepayments = recentRepaymentsSnapshot.docs
      .map((doc) => doc.data() as Repayment)
      .sort(
        (a, b) =>
          this.timestampToMillis(b.createdAt) -
          this.timestampToMillis(a.createdAt),
      )
      .slice(0, BORROWER_FLOW.RECENT_ACTIVITY_LIMIT);

    const recentActivity = recentRepayments.map((r) => {
      return {
        type: 'repayment' as const,
        description: `Repayment of LKR ${r.amount.toLocaleString()} for loan ${r.loanId}`,
        amount: r.amount,
        date: r.paidAt!,
      };
    });

    return {
      profile: {
        userId: profile.userId,
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        kycVerified: profile.kycVerified,
        profileComplete: profile.profileComplete,
      },
      activeLoans: activeLoans.length,
      pendingApplications: pendingAppsSnapshot.size,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      nextPaymentDate: nextLoan?.nextPaymentDate,
      nextPaymentAmount: nextLoan?.monthlyInstallment,
      creditScore: profile.creditScore,
      totalBorrowed: profile.totalBorrowed,
      totalRepaid: profile.totalRepaid,
      recentActivity,
    };
  }

  /**
   * Returns mock support ticket statuses for the borrower.
   */
  async getSupportStatus(borrowerId: string) {
    // In a real application, this would query a tickets collection
    // For now, return dynamic mock data that looks realistic
    return [
      {
        id: `TCK-${Math.floor(Math.random() * 90000) + 10000}`,
        title: 'Open Ticket',
        value: `TCK-${Math.floor(Math.random() * 90000) + 10000}`,
        subtitle: 'In Progress - Payment verification',
        color: '#F59E0B',
      },
      {
        id: `RPL-${Math.floor(Math.random() * 90000) + 10000}`,
        title: 'Expected Reply',
        value: 'Within 2 hours',
        subtitle: 'Average first response time',
        color: '#0EA5E9',
      },
    ];
  }
}
