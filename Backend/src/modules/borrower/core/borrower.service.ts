import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { FirebaseService } from '../../../firebase/firebase.service';
import { CreateBorrowerProfileDto } from '../profile/dto/create-profile.dto';
import { UpdateBorrowerProfileDto } from '../profile/dto/update-profile.dto';
import { MakeRepaymentDto } from '../payments/dto/make-repayment.dto';
import {
  BorrowerProfile,
  Loan,
  LoanStatus,
  Repayment,
  RepaymentStatus,
  RepaymentMethod,
} from '../types/borrower.types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { instanceToPlain } from 'class-transformer';
import {
  BORROWER_DEFAULTS,
  BORROWER_MONEY,
} from '../shared/borrower.constants';
import { CreditScoreService } from '../credit-score/credit-score.service';
import * as bcrypt from 'bcrypt';

type TimestampLike =
  | FirebaseFirestore.Timestamp
  | Date
  | { toMillis?: () => number; toDate?: () => Date }
  | null
  | undefined;

type QrTokenPayload = {
  loanId: string;
  borrowerId: string;
  amount: number;
  nonce: string;
  issuedAt: number;
};

type InstallmentRefAndData = {
  ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
  data: FirebaseFirestore.DocumentData;
};

export type BorrowerInstallmentSummary = {
  installmentId: string;
  installmentNumber: number;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  dueDate: Date | null;
};

/**
 * Core borrower service covers shared borrower profile, loan, repayment, and QR flows.
 */
@Injectable()
export class BorrowerService {
  // Firestore collection names used across this service.
  private readonly USERS_COL = 'users';
  private readonly BORROWERS_COL = 'users';
  private readonly LOAN_APPS_COL = 'loanApplications';

  private readonly LOANS_COL = 'loans';
  private readonly ADS_COL = 'loanListings';
  private readonly REPAYMENTS_COL = 'repayments';
  private readonly TRANSACTIONS_COL = 'transactions';
  private readonly QR_NONCES_COL = 'qrNonces';

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly creditScoreService: CreditScoreService,
  ) {}

  private get db() {
    return this.firebaseService.db;
  }

  /**
   * Returns the borrower's loans, optionally filtered by loan status.
   * Delegates to getLoans for core logic and sorting.
   */
  async getMyLoans(borrowerId: string, status?: string) {
    const loans = await this.getLoans(borrowerId, status as LoanStatus);

    return {
      statusCode: 200,
      message: 'Loans retrieved successfully',
      total: loans.length,
      data: loans,
    };
  }

  /**
   * Strips undefined values from an object before it goes to Firestore,
   * which rejects undefined fields and throws at write time.
   */
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

  /** Converts any Firestore-compatible timestamp to milliseconds, or 0 if null. */
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

  /** Safely casts a value to a finite number, returning a fallback when it isn't. */
  private toNumber(value: unknown, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : fallback;
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private clearRoundingDust(value: number): number {
    const rounded = this.roundMoney(value);
    return rounded <= BORROWER_MONEY.ROUNDING_DUST_THRESHOLD ? 0 : rounded;
  }

  private async findInstallmentForRepayment(
    loanId: string,
    installmentNumber: number,
  ): Promise<InstallmentRefAndData | null> {
    const installmentsRef = this.db
      .collection(this.LOANS_COL)
      .doc(loanId)
      .collection('installments');
    const expectedId = `month_${String(installmentNumber).padStart(3, '0')}`;
    const directSnapshot = await installmentsRef.doc(expectedId).get();

    if (directSnapshot.exists) {
      return {
        ref: directSnapshot.ref,
        data: directSnapshot.data() ?? {},
      };
    }

    for (const field of ['installmentNumber', 'sequence']) {
      const snapshot = await installmentsRef
        .where(field, '==', installmentNumber)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];

        return {
          ref: doc.ref,
          data: doc.data(),
        };
      }
    }

    return null;
  }

  /** Normalizes a raw date-like value into a Firestore Timestamp, or undefined if unresolvable. */
  private toTimestamp(value: unknown): FirebaseFirestore.Timestamp | undefined {
    if (!value) {
      return undefined;
    }

    if (typeof value === 'object' && value !== null) {
      if ('toDate' in value && typeof value.toDate === 'function') {
        const date = value.toDate();
        if (date instanceof Date) {
          return Timestamp.fromDate(date);
        }
      }
    }

    if (value instanceof Date) {
      return Timestamp.fromDate(value);
    }

    return undefined;
  }

  private toDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (typeof value === 'object' && value !== null) {
      if ('toDate' in value && typeof value.toDate === 'function') {
        const date = value.toDate();
        return date instanceof Date ? date : null;
      }
    }

    return null;
  }

  private normalizeInstallmentStatus(
    value: unknown,
    dueDate: Date | null,
    amount: number,
    paidAmount: number,
  ): string {
    const status = String(value ?? '')
      .trim()
      .toLowerCase();

    if (['paid', 'completed'].includes(status) || paidAmount >= amount) {
      return 'paid';
    }

    if (['pending_verification', 'verification_pending'].includes(status)) {
      return 'pending_verification';
    }

    if (paidAmount > 0) {
      return 'partially_paid';
    }

    if (dueDate && dueDate.getTime() < Date.now()) {
      return 'overdue';
    }

    return status || 'pending';
  }

  /**
   * Maps a raw status string to a known LoanStatus without treating unknown
   * lifecycle states as active loans.
   * Logs a warning when an unrecognised status is encountered so it surfaces in monitoring.
   */
  private normalizeLoanStatus(value: unknown): LoanStatus {
    const status = String(value ?? '').toLowerCase();

    if (Object.values(LoanStatus).includes(status as LoanStatus)) {
      return status as LoanStatus;
    }

    console.warn(
      `[BorrowerService] Unrecognised loan status "${status}" — defaulting to UNKNOWN`,
    );

    return LoanStatus.UNKNOWN;
  }

  /**
   * Converts a raw Firestore loan document into a typed Loan object,
   * filling in sensible numeric defaults for any missing fields.
   */
  private normalizeLoanDocument(
    data: FirebaseFirestore.DocumentData,
    documentId?: string,
  ): Loan {
    const now = Timestamp.now();
    const status = this.normalizeLoanStatus(data.status);
    const createdAt = this.toTimestamp(data.createdAt) ?? now;
    const updatedAt = this.toTimestamp(data.updatedAt) ?? createdAt;
    const startDate =
      this.toTimestamp(data.disbursedAt) ??
      this.toTimestamp(data.approvedAt) ??
      this.toTimestamp(data.startDate) ??
      createdAt;
    const scheduledDueDate =
      this.toTimestamp(data.firstPaymentDueAt) ??
      this.toTimestamp(data.nextDueDate);
    const nextDueDate =
      scheduledDueDate ??
      (status === LoanStatus.PENDING_DISBURSEMENT ? null : startDate);
    const endDate =
      this.toTimestamp(data.maturityDate) ??
      this.toTimestamp(data.endDate) ??
      nextDueDate ??
      startDate;

    const principalAmount =
      typeof data.principalMinor === 'number'
        ? data.principalMinor / 100
        : this.toNumber(data.principalAmount);
    const tenureMonths = this.toNumber(data.tenureMonths);
    const totalInterest =
      typeof data.interestAmountMinor === 'number'
        ? data.interestAmountMinor / 100
        : this.toNumber(data.totalInterest);
    const totalRepayable =
      typeof data.totalRepayableMinor === 'number'
        ? data.totalRepayableMinor / 100
        : this.toNumber(data.totalRepayable, principalAmount + totalInterest);
    const monthlyInstallment =
      typeof data.monthlyInstallmentMinor === 'number'
        ? data.monthlyInstallmentMinor / 100
        : this.toNumber(
            data.monthlyInstallment,
            tenureMonths > 0 ? Math.round(totalRepayable / tenureMonths) : 0,
          );
    const outstandingBalance =
      typeof data.remainingBalanceMinor === 'number'
        ? data.remainingBalanceMinor / 100
        : this.toNumber(
            data.outstandingBalance,
            status === LoanStatus.COMPLETED
              ? 0
              : totalRepayable || principalAmount,
          );

    return {
      loanId: String(data.loanId ?? documentId ?? ''),
      requestId: String(data.applicationId ?? data.requestId ?? ''),
      borrowerId: String(data.borrowerId ?? ''),
      lenderId: String(data.lenderId ?? ''),
      lenderName: data.lenderName ? String(data.lenderName) : undefined,
      principalAmount,
      interestRate: this.toNumber(
        data.annualInterestRate,
        this.toNumber(data.interestRate),
      ),
      tenureMonths,
      monthlyInstallment,
      outstandingBalance,
      totalInterest,
      status,
      startDate,
      nextDueDate,
      endDate,
      repaymentsMade: this.toNumber(data.repaymentsMade),
      createdAt,
      updatedAt,
    };
  }

  /**
   * Converts a raw lender ad document into the loan-shaped structure
   * the borrower UI expects for discovery cards.
   */
  private normalizeAdDocument(
    data: FirebaseFirestore.DocumentData,
    documentId?: string,
  ): Partial<Loan> & Record<string, unknown> {
    const adId = String(data.listingId ?? data.adId ?? documentId ?? '');
    const minAmount =
      typeof data.minAmountMinor === 'number'
        ? data.minAmountMinor / 100
        : this.toNumber(data.minAmount);
    const maxAmount =
      typeof data.maxAmountMinor === 'number'
        ? data.maxAmountMinor / 100
        : this.toNumber(data.maxAmount);
    const durationMonths = this.toNumber(
      data.maxTenureMonths,
      this.toNumber(data.tenureMonths),
    );

    return {
      ...data,
      adId,
      loanId: adId,
      lenderId: data.lenderId,
      lenderName: data.lenderName,
      lenderLocation: data.location,
      principalAmount: maxAmount,
      maxAmount,
      minAmount,
      amount: maxAmount,
      interestRate: this.toNumber(
        data.minInterestRateAnnual,
        this.toNumber(data.preferredInterestRate),
      ),
      durationMonths,
      tenureMonths: durationMonths,
      minTenureMonths: this.toNumber(data.minTenureMonths),
      maxTenureMonths: durationMonths,
      preferredPurposes: Array.isArray(data.purposeCategories)
        ? data.purposeCategories
        : data.preferredPurposes,
      isFeatured:
        data.isBoosted === true &&
        (this.toDate(data.boostEndsAt)?.getTime() ?? 0) > Date.now(),
    };
  }

  /**
   * Picks the first non-empty display name from a Firestore document,
   * trying fullName, displayName, and name in order.
   */
  private readDisplayName(
    data?: FirebaseFirestore.DocumentData,
  ): string | null {
    const name =
      typeof data?.fullName === 'string' && data.fullName.trim().length > 0
        ? data.fullName
        : typeof data?.displayName === 'string' &&
            data.displayName.trim().length > 0
          ? data.displayName
          : typeof data?.name === 'string' && data.name.trim().length > 0
            ? data.name
            : null;

    return name?.trim() ?? null;
  }

  /**
   * Batch-fetches lender display names from the borrowers collection.
   * Returns a Map of lenderId → fullName.
   */
  async getLenderNamesMap(lenderIds: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(lenderIds.filter(Boolean))];
    const nameMap = new Map<string, string>();

    if (unique.length === 0) return nameMap;

    await Promise.all(
      unique.map(async (lenderId) => {
        const doc = await this.db
          .collection(this.USERS_COL)
          .doc(lenderId)
          .get();
        if (!doc?.exists) return;

        const name = this.readDisplayName(doc.data());
        if (name) {
          nameMap.set(lenderId, name);
        }
      }),
    );

    // Firestore `in` queries support max 30 values; chunk if needed.
    for (const field of ['uid', 'userId']) {
      const missing = unique.filter((lenderId) => !nameMap.has(lenderId));
      if (missing.length === 0) break;

      for (let i = 0; i < missing.length; i += 30) {
        const chunk = missing.slice(i, i + 30);
        const snapshot = await this.db
          .collection(this.USERS_COL)
          .where(field, 'in', chunk)
          .get();

        for (const doc of snapshot?.docs ?? []) {
          const data = doc.data() as {
            uid?: string;
            userId?: string;
          };
          const lenderId = data.uid ?? data.userId ?? doc.id;
          const name = this.readDisplayName(data);
          if (name) {
            nameMap.set(lenderId, name);
          }
        }
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

    // Sync back to 'users' collection to ensure identity consistency
    try {
      await this.db.collection('users').doc(plainDto.userId).update({
        fullName: plainDto.fullName,
        email: plainDto.email,
        updatedAt: now,
      });
    } catch (e) {
      console.warn(
        `[BorrowerService] Could not sync back to users collection during creation: ${e}`,
      );
    }

    const created = await this.db
      .collection(this.BORROWERS_COL)
      .doc(plainDto.userId)
      .get();

    return { ...created.data() } as BorrowerProfile;
  }

  /**
   * Returns a borrower profile, merging photo URL fields from both
   * the borrowers and users collections so the UI always has an image to display.
   */
  async getProfile(userId: string): Promise<BorrowerProfile> {
    const [doc, userDoc] = await Promise.all([
      this.db.collection(this.BORROWERS_COL).doc(userId).get(),
      this.db.collection('users').doc(userId).get(),
    ]);

    if (!doc.exists) {
      throw new NotFoundException(
        `Borrower profile not found for user ${userId}`,
      );
    }

    const profileData = doc.data() ?? {};
    const userData = userDoc.data() ?? {};
    const nestedBorrowerProfile =
      profileData.borrowerProfile &&
      typeof profileData.borrowerProfile === 'object' &&
      !Array.isArray(profileData.borrowerProfile)
        ? (profileData.borrowerProfile as Record<string, unknown>)
        : {};
    const nestedKycDetails =
      profileData.kycDetails &&
      typeof profileData.kycDetails === 'object' &&
      !Array.isArray(profileData.kycDetails)
        ? (profileData.kycDetails as Record<string, unknown>)
        : {};
    const pickProfileImageUrl = (...values: unknown[]): string => {
      const value = values.find(
        (item) => typeof item === 'string' && item.trim().length > 0,
      );

      return typeof value === 'string' ? value.trim() : '';
    };
    const photoURL = pickProfileImageUrl(
      profileData.photoURL,
      profileData.photoUrl,
      profileData.profilePictureUrl,
      profileData.profilePicUrl,
      profileData.profilePhotoUrl,
      profileData.profilePicture,
      profileData.imageUrl,
      profileData.avatarUrl,
      userData.photoURL,
      userData.photoUrl,
      userData.profilePictureUrl,
      userData.profilePicUrl,
      userData.profilePhotoUrl,
      userData.profilePicture,
      userData.imageUrl,
      userData.avatarUrl,
    );
    const rootMonthlyIncome = this.toNumber(profileData.monthlyIncome, NaN);
    const nestedMonthlyIncomeMinor = this.toNumber(
      nestedBorrowerProfile.monthlyIncomeMinor,
      NaN,
    );
    const monthlyIncome = Number.isFinite(rootMonthlyIncome)
      ? rootMonthlyIncome
      : Number.isFinite(nestedMonthlyIncomeMinor)
        ? this.roundMoney(nestedMonthlyIncomeMinor / 100)
        : 0;

    return {
      userId: doc.id,
      ...profileData,
      dateOfBirth:
        profileData.dateOfBirth ?? nestedBorrowerProfile.dateOfBirth ?? '',
      nic:
        profileData.nic ??
        nestedBorrowerProfile.nic ??
        nestedKycDetails.documentNumber ??
        '',
      employmentStatus:
        profileData.employmentStatus ??
        nestedBorrowerProfile.employmentStatus ??
        '',
      occupation:
        profileData.occupation ?? nestedBorrowerProfile.occupation ?? '',
      monthlyIncome,
      // The users record is the canonical KYC review state. Derive this value
      // at read time so an approved account never remains pending in mobile.
      kycVerified: userData.kycStatus === 'approved',
      photoURL,
      profilePicture: profileData.profilePicture ?? userData.profilePicture,
      profilePictureUrl:
        profileData.profilePictureUrl ?? userData.profilePictureUrl,
      profilePicUrl: profileData.profilePicUrl ?? userData.profilePicUrl,
      profilePhotoUrl: profileData.profilePhotoUrl ?? userData.profilePhotoUrl,
      imageUrl: profileData.imageUrl ?? userData.imageUrl,
      avatarUrl: profileData.avatarUrl ?? userData.avatarUrl,
    } as BorrowerProfile;
  }

  /** Updates profile data and canonical credentials in one atomic batch. */
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

    const plainDto = this.removeUndefinedDeep(
      instanceToPlain(dto) as UpdateBorrowerProfileDto,
    );
    const { password, currentPassword } = plainDto;
    // Keep this allowlist at the persistence boundary as defense in depth.
    // UpdateBorrowerProfileDto shares the `users` document with authorization
    // fields, so unknown request properties must never be spread into Firestore.
    const profileUpdateDto = this.removeUndefinedDeep({
      fullName: plainDto.fullName,
      email: plainDto.email,
      phone: plainDto.phone,
      address: plainDto.address,
      employmentStatus: plainDto.employmentStatus,
      monthlyIncome: plainDto.monthlyIncome,
      occupation: plainDto.occupation,
    });
    const existing = doc.data() ?? {};
    const requestedEmail = profileUpdateDto.email?.trim().toLowerCase();
    const emailChanged =
      Boolean(requestedEmail) && requestedEmail !== existing.email;
    if (requestedEmail) profileUpdateDto.email = requestedEmail;
    let passwordHash: string | null = null;

    if (password || emailChanged) {
      if (!currentPassword) {
        throw new UnauthorizedException(
          'Current password is required for email or password changes.',
        );
      }
      const credentials = await this.db
        .collection('authCredentials')
        .doc(userId)
        .get();
      if (
        !credentials.exists ||
        !(await bcrypt.compare(
          currentPassword,
          String(credentials.get('passwordHash') ?? ''),
        ))
      ) {
        throw new UnauthorizedException('Current password is incorrect.');
      }
      if (password === currentPassword) {
        throw new BadRequestException(
          'New password must be different from the current password.',
        );
      }
      if (password) passwordHash = await bcrypt.hash(password, 10);
    }

    if (emailChanged && requestedEmail) {
      const duplicate = await this.db
        .collection(this.USERS_COL)
        .where('email', '==', requestedEmail)
        .limit(1)
        .get();
      if (duplicate.docs.some((candidate) => candidate.id !== userId)) {
        throw new ConflictException(
          'An account with that email already exists.',
        );
      }
      profileUpdateDto.email = requestedEmail;
    }

    const updateData: Record<string, unknown> = {
      ...profileUpdateDto,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (profileUpdateDto.occupation !== undefined) {
      updateData['borrowerProfile.occupation'] = profileUpdateDto.occupation;
    }
    if (profileUpdateDto.employmentStatus !== undefined) {
      updateData['borrowerProfile.employmentStatus'] =
        profileUpdateDto.employmentStatus;
    }
    if (profileUpdateDto.monthlyIncome !== undefined) {
      updateData['borrowerProfile.monthlyIncomeMinor'] = Math.round(
        profileUpdateDto.monthlyIncome * 100,
      );
    }
    const batch = this.db.batch();
    batch.update(doc.ref, updateData);
    if (passwordHash) {
      batch.update(this.db.collection('authCredentials').doc(userId), {
        passwordHash,
        passwordChangedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }
    await batch.commit();

    return this.getProfile(userId);
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
    const loans = snapshot.docs.map((doc) =>
      this.normalizeLoanDocument(doc.data(), doc.id),
    );

    return loans.sort(
      (a, b) =>
        this.timestampToMillis(b.createdAt) -
        this.timestampToMillis(a.createdAt),
    );
  }

  /**
   * Lists active lender ads for borrower loan discovery.
   */
  async getActiveLoanAds() {
    const snapshot = await this.db
      .collection(this.ADS_COL)
      .where('status', 'in', ['active', 'approved'])
      .get();

    const now = Date.now();
    const expiredBoosts = snapshot.docs.filter((doc) => {
      const data = doc.data();
      return (
        data.isBoosted === true &&
        (this.toDate(data.boostEndsAt)?.getTime() ?? 0) <= now
      );
    });
    if (expiredBoosts.length > 0) {
      const batch = this.db.batch();
      expiredBoosts.forEach((doc) => {
        const activeBoostId = doc.get('activeBoostId');
        batch.update(doc.ref, {
          isBoosted: false,
          boostStatus: 'expired',
          activeBoostId: null,
          updatedAt: Timestamp.now(),
        });
        if (typeof activeBoostId === 'string' && activeBoostId) {
          batch.update(this.db.collection('adBoostRequests').doc(activeBoostId), {
            status: 'expired',
            updatedAt: Timestamp.now(),
          });
        }
      });
      await batch.commit();
    }

    const ads = snapshot.docs.map((doc) =>
      this.normalizeAdDocument(doc.data(), doc.id),
    );

    return ads.sort((a, b) => {
      const featuredDifference = Number(b.isFeatured) - Number(a.isFeatured);
      return (
        featuredDifference ||
        this.timestampToMillis(b.createdAt as TimestampLike) -
          this.timestampToMillis(a.createdAt as TimestampLike)
      );
    });
  }

  /**
   * Returns one loan after confirming borrower ownership.
   */
  async getLoanById(loanId: string, borrowerId: string): Promise<Loan> {
    const doc = await this.db.collection(this.LOANS_COL).doc(loanId).get();

    if (!doc.exists) {
      throw new NotFoundException(`Loan ${loanId} not found`);
    }

    const loan = this.normalizeLoanDocument(doc.data() ?? {}, doc.id);

    if (loan.borrowerId !== borrowerId) {
      throw new ForbiddenException('Access denied to this loan');
    }

    return loan;
  }

  async getBorrowerLoanInstallments(
    loanId: string,
    borrowerId: string,
  ): Promise<BorrowerInstallmentSummary[]> {
    await this.getLoanById(loanId, borrowerId);

    const snapshot = await this.db
      .collection(this.LOANS_COL)
      .doc(loanId)
      .collection('installments')
      .get();

    return snapshot.docs
      .map((doc) => {
        const data = doc.data();
        const amount = this.toNumber(
          data.amount ?? data.amountDue,
          typeof data.amountDueMinor === 'number'
            ? data.amountDueMinor / 100
            : 0,
        );
        const paidAmount = this.toNumber(
          data.paidAmount ?? data.amountPaid,
          String(data.status ?? '').toLowerCase() === 'paid' ? amount : 0,
        );
        const dueDate = this.toDate(
          data.dueDate ?? data.dueDateAt ?? data.dueAt,
        );
        const status = this.normalizeInstallmentStatus(
          data.status,
          dueDate,
          amount,
          paidAmount,
        );

        return {
          installmentId: String(data.installmentId ?? doc.id),
          installmentNumber: this.toNumber(
            data.installmentNumber ?? data.sequence,
          ),
          amount,
          paidAmount,
          remainingAmount: this.clearRoundingDust(
            Math.max(0, amount - paidAmount),
          ),
          status,
          dueDate,
        };
      })
      .sort((a, b) => {
        const aTime = a.dueDate ? a.dueDate.getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.dueDate ? b.dueDate.getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime || a.installmentNumber - b.installmentNumber;
      });
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

    if (loan.status === LoanStatus.PENDING_DISBURSEMENT) {
      return [];
    }

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
    const principal = loan.principalAmount;
    const term = loan.tenureMonths;

    // timestampToMillis handles all TimestampLike variants safely — avoids a
    // direct .toDate() call that would crash if startDate isn't a Firestore Timestamp.
    const disbursedAt = new Date(this.timestampToMillis(loan.startDate));

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
      const interestAmount = this.roundMoney(remainingBalance * monthlyRate);
      const principalAmount =
        i === term
          ? this.roundMoney(remainingBalance)
          : this.roundMoney(loan.monthlyInstallment - interestAmount);
      const totalAmount =
        i === term
          ? this.roundMoney(principalAmount + interestAmount)
          : loan.monthlyInstallment;
      remainingBalance =
        i === term
          ? 0
          : this.clearRoundingDust(
              Math.max(0, remainingBalance - principalAmount),
            );

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
        principalAmount,
        interestAmount,
        totalAmount,
        remainingBalance,
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
    if (loan.status === LoanStatus.PENDING_DISBURSEMENT) {
      throw new BadRequestException(
        'Repayments are unavailable until the loan is active.',
      );
    }
    if (loan.status === LoanStatus.UNKNOWN) {
      throw new BadRequestException(
        'Repayments are unavailable for this loan status.',
      );
    }
    if (!Number.isFinite(dto.amount)) {
      throw new BadRequestException(
        'Repayment amount must be a finite number.',
      );
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
    const transactionRef = this.db.collection(this.TRANSACTIONS_COL).doc();

    // Calculate principal vs interest split
    const monthlyRate = loan.interestRate / 100 / 12;
    const interestPaid = Math.min(
      dto.amount,
      this.roundMoney(loan.outstandingBalance * monthlyRate),
    );
    const principalPaid = this.roundMoney(dto.amount - interestPaid);

    const installmentNumber = loan.repaymentsMade + 1;
    const installmentRecord = await this.findInstallmentForRepayment(
      dto.loanId,
      installmentNumber,
    );
    const installmentId = installmentRecord?.ref.id;
    if (dto.paymentMethod === RepaymentMethod.BANK_TRANSFER) {
      if (!dto.receiptDocumentId?.trim()) {
        throw new BadRequestException(
          'A receipt document is required for bank transfers.',
        );
      }
      if (!installmentId) {
        throw new BadRequestException(
          'No unpaid installment is available for this receipt.',
        );
      }
      const receipt = await this.db
        .collection('documents')
        .doc(dto.receiptDocumentId.trim())
        .get();
      if (
        !receipt.exists ||
        receipt.get('userId') !== dto.borrowerId ||
        receipt.get('category') !== 'payment_receipt' ||
        receipt.get('relatedEntityType') !== 'loan' ||
        receipt.get('relatedEntityId') !== dto.loanId
      ) {
        throw new BadRequestException(
          'The receipt document does not match this borrower and loan.',
        );
      }
      const duplicate = await this.db
        .collection(this.TRANSACTIONS_COL)
        .where('loanId', '==', dto.loanId)
        .where('installmentId', '==', installmentId)
        .where('status', '==', RepaymentStatus.PENDING_VERIFICATION)
        .limit(1)
        .get();
      if (!duplicate.empty) {
        throw new BadRequestException(
          'A receipt for this installment is already waiting for lender review.',
        );
      }
    }
    const rawOutstanding = Math.max(0, loan.outstandingBalance - dto.amount);
    const newOutstanding =
      rawOutstanding <= BORROWER_MONEY.ROUNDING_DUST_THRESHOLD
        ? 0
        : this.roundMoney(rawOutstanding);

    const status =
      dto.paymentMethod === RepaymentMethod.CARD
        ? RepaymentStatus.COMPLETED
        : dto.paymentMethod === RepaymentMethod.BANK_TRANSFER
          ? RepaymentStatus.PENDING_VERIFICATION
          : RepaymentStatus.PENDING;
    const requiresVerification =
      dto.paymentMethod === RepaymentMethod.BANK_TRANSFER;
    const verifiedByLender = status === RepaymentStatus.COMPLETED;
    const verificationStatus = verifiedByLender
      ? 'approved'
      : requiresVerification
        ? 'pending_verification'
        : 'awaiting_lender_scan';

    const repaymentData = {
      repaymentId: repaymentRef.id,
      loanId: dto.loanId,
      borrowerId: dto.borrowerId,
      lenderId: loan.lenderId,
      amount: dto.amount,
      amountMinor: Math.round(dto.amount * 100),
      platformFeeMinor: 0,
      principalPaid,
      interestPaid,
      paymentMethod: dto.paymentMethod,
      transactionReference: dto.transactionReference ?? null,
      paymentProofUrl: dto.paymentProofUrl ?? null,
      receiptDocumentId: dto.receiptDocumentId?.trim() || null,
      status: status,
      dueDate: loan.nextDueDate,
      paidAt: status === RepaymentStatus.COMPLETED ? now : null,
      installmentId: installmentId ?? null,
      installmentNumber,
      requiresVerification,
      verificationStatus,
      verifiedByLender,
      createdAt: now,
    };
    const transactionData = {
      transactionId: transactionRef.id,
      paymentId: repaymentRef.id,
      repaymentId: repaymentRef.id,
      loanId: dto.loanId,
      installmentId: installmentId ?? null,
      borrowerId: dto.borrowerId,
      lenderId: loan.lenderId,
      amount: dto.amount,
      amountMinor: Math.round(dto.amount * 100),
      platformFeeMinor: 0,
      type: 'repayment',
      status,
      paymentMethod: dto.paymentMethod,
      paymentType: dto.paymentMethod,
      transactionReference: dto.transactionReference ?? null,
      paymentProofUrl: dto.paymentProofUrl ?? null,
      receiptDocumentId: dto.receiptDocumentId?.trim() || null,
      requiresVerification,
      verificationStatus,
      verifiedByLender,
      paidAt: status === RepaymentStatus.COMPLETED ? now : null,
      createdAt: now,
      updatedAt: now,
    };

    // Use a batch write for atomicity
    const batch = this.db.batch();

    batch.set(repaymentRef, repaymentData);
    batch.set(transactionRef, transactionData);

    const isFullyRepaid = newOutstanding === 0;
    const nextDueDate = new Date();
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);

    if (status === RepaymentStatus.COMPLETED) {
      // Keep loan progress and borrower aggregates in sync in the same batch.
      batch.update(this.db.collection(this.LOANS_COL).doc(dto.loanId), {
        outstandingBalance: newOutstanding,
        repaymentsMade: FieldValue.increment(1),
        status: isFullyRepaid ? LoanStatus.COMPLETED : loan.status,
        nextDueDate: isFullyRepaid ? null : nextDueDate,
        updatedAt: now,
      });

      if (installmentRecord) {
        const installment = installmentRecord.data;
        const paidAmount = this.roundMoney(
          this.toNumber(installment.paidAmount ?? installment.amountPaid) +
            dto.amount,
        );
        const amountDue = this.toNumber(
          installment.amount ?? installment.amountDue,
          typeof installment.amountDueMinor === 'number'
            ? installment.amountDueMinor / 100
            : dto.amount,
        );
        const remainingAmount = this.clearRoundingDust(
          Math.max(0, amountDue - paidAmount),
        );

        batch.update(installmentRecord.ref, {
          status: remainingAmount === 0 ? 'paid' : 'partially_paid',
          paidAmount,
          amountPaid: paidAmount,
          remainingAmount,
          paidTransactionId: remainingAmount === 0 ? transactionRef.id : null,
          paidAt: remainingAmount === 0 ? now : null,
          updatedAt: now,
        });
      }

      // Update borrower's totalRepaid
      batch.update(this.db.collection(this.BORROWERS_COL).doc(dto.borrowerId), {
        totalRepaid: FieldValue.increment(dto.amount),
        activeLoans: isFullyRepaid
          ? FieldValue.increment(-1)
          : FieldValue.increment(0),
        updatedAt: now,
      });
    }

    await batch.commit();

    if (status === RepaymentStatus.COMPLETED) {
      this.creditScoreService
        .calculateCreditScore(dto.borrowerId)
        .catch((error) =>
          console.error('[CreditScore] Recalc failed after repayment:', error),
        );
    }

    // The batch is already committed at this point. If the read-back fails,
    // fall back to the locally constructed repayment so the caller still gets
    // a meaningful response rather than a 500 for a write that succeeded.
    try {
      const created = await repaymentRef.get();
      return { ...created.data() } as Repayment;
    } catch {
      return repaymentData as unknown as Repayment;
    }
  }

  /**
   * Generates a signed short-lived QR token for a borrower repayment flow.
   */
  async generateQrToken(loanId: string, borrowerId: string, amount?: number) {
    const loan = await this.getLoanById(loanId, borrowerId);

    if (loan.status === LoanStatus.COMPLETED) {
      throw new BadRequestException('Cannot generate QR for a completed loan.');
    }
    if (loan.status === LoanStatus.PENDING_DISBURSEMENT) {
      throw new BadRequestException(
        'Payment QR is unavailable until the loan is active.',
      );
    }
    if (loan.status === LoanStatus.UNKNOWN) {
      throw new BadRequestException(
        'Payment QR is unavailable for this loan status.',
      );
    }

    // Guard against loans that are not yet marked completed but carry a zero balance,
    if (
      this.clearRoundingDust(loan.outstandingBalance) <=
      BORROWER_MONEY.ROUNDING_DUST_THRESHOLD
    ) {
      throw new BadRequestException(
        'Cannot generate QR for a loan with no outstanding balance.',
      );
    }

    const preferredAmount =
      typeof amount === 'number' && amount > 0
        ? amount
        : loan.monthlyInstallment || 0;

    const safeAmount = Math.min(preferredAmount, loan.outstandingBalance);
    const now = Date.now();
    const expiresAt = now + 5 * 60 * 1000;
    const nonce = this.db.collection(this.QR_NONCES_COL).doc().id;

    const payload: QrTokenPayload = {
      loanId,
      borrowerId,
      amount: Math.max(0, Math.round(safeAmount * 100) / 100),
      nonce,
      issuedAt: now,
    };

    const token = await this.jwtService.signAsync(payload);

    await this.db.collection(this.QR_NONCES_COL).doc(nonce).set({
      nonce,
      loanId,
      borrowerId,
      amount: payload.amount,
      issuedAt: now,
      expiresAt,
      used: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      token,
      expiresAt,
      loanId,
      borrowerId,
      amount: payload.amount,
    };
  }

  /**
   * Verifies signed QR token integrity and marks nonce as used.
   */
  async verifyQrToken(token: string, consume = true, allowUsed = false) {
    let payload: QrTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<QrTokenPayload>(token);
    } catch {
      throw new BadRequestException('QR code is invalid or expired.');
    }

    if (!payload?.nonce || !payload.loanId || !payload.borrowerId) {
      throw new BadRequestException('QR code payload is invalid.');
    }

    const nonceRef = this.db.collection(this.QR_NONCES_COL).doc(payload.nonce);

    const validateNonce = async (markUsed: boolean) =>
      this.db.runTransaction(async (tx) => {
        const nonceDoc = await tx.get(nonceRef);
        if (!nonceDoc.exists) {
          throw new BadRequestException('QR nonce not found.');
        }

        const nonceData = nonceDoc.data() as
          | { used?: boolean; expiresAt?: number }
          | undefined;

        if (nonceData?.used && !allowUsed) {
          throw new BadRequestException('QR code has already been used.');
        }

        if (
          !nonceData?.used &&
          typeof nonceData?.expiresAt === 'number' &&
          nonceData.expiresAt < Date.now()
        ) {
          throw new BadRequestException('QR code is expired.');
        }

        if (markUsed && !nonceData?.used) {
          tx.update(nonceRef, {
            used: true,
            usedAt: FieldValue.serverTimestamp(),
          });
        }
      });

    await validateNonce(consume);

    await this.getLoanById(payload.loanId, payload.borrowerId);

    return {
      valid: true,
      payload,
    };
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
   * Reads borrower-visible repayment transactions from the shared transaction log.
   * This keeps borrower history populated for seeded data and for newly-created
   * borrower repayments without changing the lender ledger flow.
   */
  async getBorrowerRepaymentTransactions(
    borrowerId: string,
    loanIds?: string[],
  ): Promise<Array<Record<string, unknown>>> {
    const snapshot = await this.db
      .collection(this.TRANSACTIONS_COL)
      .where('borrowerId', '==', borrowerId)
      .get();
    const loanIdSet = loanIds?.length ? new Set(loanIds) : null;

    return snapshot.docs
      .map(
        (doc): Record<string, unknown> => ({
          transactionId: doc.id,
          ...doc.data(),
        }),
      )
      .filter((transaction) => {
        const loanId =
          typeof transaction.loanId === 'string' ? transaction.loanId : '';
        const type = String(transaction.type ?? '').toLowerCase();
        const status = String(transaction.status ?? '').toLowerCase();

        if (loanIdSet && !loanIdSet.has(loanId)) {
          return false;
        }

        return (
          type === 'repayment' ||
          type.includes('repay') ||
          ['paid', 'completed', 'success', 'successful'].includes(status)
        );
      })
      .sort(
        (a, b) =>
          this.timestampToMillis(b.paidAt as TimestampLike) -
            this.timestampToMillis(a.paidAt as TimestampLike) ||
          this.timestampToMillis(b.createdAt as TimestampLike) -
            this.timestampToMillis(a.createdAt as TimestampLike),
      );
  }
}
