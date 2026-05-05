import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { type CollectionReference, Timestamp } from 'firebase-admin/firestore';

import { FirebaseService } from '../../firebase/firebase.service';
import {
  AuthResponseDto,
  MeResponseDto,
  RegisterResponseDto,
  SafeUserDto,
} from './dto/auth-response.dto';
import {
  DashboardListItemDto,
  DashboardMetricDto,
  DashboardResponseDto,
} from './dto/dashboard-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserDocument, UserRole, KycStatus, USER_ROLES } from './auth.types';

@Injectable()
export class AuthService {
  private readonly usersCollection: CollectionReference<UserDocument>;

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly jwtService: JwtService,
  ) {
    this.usersCollection = this.firebaseService.db.collection(
      'users',
    ) as CollectionReference<UserDocument>;
  }

  // Registers a local account and stores the normalized identity fields used for login lookups.
  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    const emailLower = this.normalizeEmail(registerDto.email);
    const phoneNormalized = this.normalizePhone(registerDto.phone);

    const [emailExists, phoneExists] = await Promise.all([
      this.hasExistingEmail(emailLower),
      this.hasExistingPhone(phoneNormalized),
    ]);

    if (emailExists) {
      throw new ConflictException('An account with that email already exists.');
    }

    if (phoneExists) {
      throw new ConflictException(
        'An account with that phone number already exists.',
      );
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);
    const userRef = this.usersCollection.doc();
    const now = Timestamp.now();
    const user: UserDocument = {
      uid: userRef.id,
      role: [registerDto.role],
      fullName: registerDto.fullName.trim(),
      photoURL: '',
      phone: registerDto.phone.trim(),
      email: registerDto.email.trim(),
      emailLower,
      phoneNormalized,
      passwordHash,
      creditScore: 0,
      rating: 0,
      totalLoansCompleted: 0,
      totalAmountLent: 0,
      totalAmountBorrowed: 0,
      kycStatus: 'not_submitted',
      accountStatus: 'active',
      authProvider: 'local',
      createdAt: now,
      updatedAt: now,
    };

    await userRef.set(user);

    return {
      message: 'Account created successfully. Please log in to continue.',
      user: this.toSafeUser(user, registerDto.role),
    };
  }

  // Validates credentials, resolves the active role, and issues a JWT for that session.
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.findUserByIdentifier(loginDto.identifier);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (user.accountStatus !== 'active') {
      throw new UnauthorizedException('This account is not active.');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const activeRole = this.resolveLoginRole(user, loginDto.role);

    const accessToken = this.jwtService.sign({
      sub: user.uid,
      email: user.email,
      role: activeRole,
    });

    await this.usersCollection.doc(user.uid).update({
      lastLoginAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return {
      accessToken,
      user: this.toSafeUser(user, activeRole),
    };
  }

  // Loads the current user's safe profile payload without exposing sensitive fields.
  async getMe(userId: string): Promise<MeResponseDto> {
    const user = await this.getRequiredUser(userId);

    return {
      user: this.toSafeUser(user),
    };
  }

  // Builds the dashboard data by combining user data with related loans, relationships, and ads.
  async getDashboard(
    userId: string,
    activeRole: UserRole,
  ): Promise<DashboardResponseDto> {
    const user = await this.getRequiredUser(userId);
    const roles = this.getRoles(user.role);
    const role = roles.includes(activeRole) ? activeRole : roles[0];

    if (role === 'admin') {
      return this.getAdminDashboard(userId);
    }

    const [loanDocs, relationDocs, adDocs] = await Promise.all([
      this.getCollectionDocs(
        'loans',
        role === 'borrower' ? 'borrowerId' : 'lenderId',
        userId,
      ),
      this.getCollectionDocs(
        'lenderBorrowers',
        role === 'borrower' ? 'borrowerId' : 'lenderId',
        userId,
      ),
      role === 'lender'
        ? this.getCollectionDocs('ads', 'lenderId', userId)
        : Promise.resolve([]),
    ]);

    const sortedLoanDocs = this.sortByTimestamp(loanDocs, 'createdAt').slice(
      0,
      4,
    );
    const sortedRelationDocs = this.sortByTimestamp(
      relationDocs,
      'latestLoanCreatedAt',
    ).slice(0, 4);
    const sortedAdDocs = this.sortByTimestamp(adDocs, 'createdAt').slice(0, 4);

    return {
      user: this.toSafeUser(user, role),
      role,
      headline:
        role === 'borrower'
          ? `Welcome back, ${user.fullName}`
          : `Portfolio overview for ${user.fullName}`,
      summary:
        role === 'borrower'
          ? 'Track active loans, trusted lender relationships, and your current credit standing.'
          : 'Review your lending activity, active listings, and borrower network in one place.',
      metrics:
        role === 'borrower'
          ? this.buildBorrowerMetrics(user, loanDocs, relationDocs)
          : this.buildLenderMetrics(user, loanDocs, relationDocs, adDocs),
      primaryListTitle:
        role === 'borrower' ? 'Recent loan activity' : 'Active lender listings',
      primaryList:
        role === 'borrower'
          ? sortedLoanDocs.map((doc) => this.toBorrowerLoanItem(doc))
          : sortedAdDocs.map((doc) => this.toLenderAdItem(doc)),
      secondaryListTitle:
        role === 'borrower' ? 'Connected lenders' : 'Borrower relationships',
      secondaryList:
        role === 'borrower'
          ? sortedRelationDocs.map((doc) => this.toBorrowerRelationItem(doc))
          : sortedRelationDocs.map((doc) => this.toLenderRelationItem(doc)),
    };
  }

  // Aggregates cross-user metrics for the admin review dashboard.
  async getAdminDashboard(userId: string): Promise<DashboardResponseDto> {
    const user = await this.getRequiredUser(userId);
    const snapshot = await this.usersCollection.get();
    const users = snapshot.docs.map((doc) => doc.data() as UserDocument);
    const pendingUsers = users.filter((candidate) =>
      ['pending', 'under_review', 'not_submitted'].includes(
        candidate.kycStatus,
      ),
    );
    const recentUsers = this.sortByTimestamp(
      users.map((candidate) => ({
        ...candidate,
        id: candidate.uid,
      })),
      'createdAt',
    ).slice(0, 5);

    return {
      user: this.toSafeUser(user, 'admin'),
      role: 'admin',
      headline: `Admin review center for ${user.fullName}`,
      summary:
        'Review account readiness, KYC status, and role distribution before enabling users for the lending workflow.',
      metrics: [
        this.metric(
          'Total users',
          String(users.length),
          'All Firestore user records',
        ),
        this.metric(
          'Borrowers',
          String(
            users.filter((candidate) =>
              this.hasRole(candidate.role, 'borrower'),
            ).length,
          ),
          'Registered borrower accounts',
        ),
        this.metric(
          'Lenders',
          String(
            users.filter((candidate) => this.hasRole(candidate.role, 'lender'))
              .length,
          ),
          'Registered lender accounts',
        ),
        this.metric(
          'KYC to review',
          String(pendingUsers.length),
          'Users not approved yet',
        ),
      ],
      primaryListTitle: 'KYC review queue',
      primaryList: pendingUsers.slice(0, 5).map((candidate) => ({
        id: candidate.uid,
        title: candidate.fullName,
        subtitle: `${candidate.email} - ${this.getRoles(candidate.role).join(', ')}`,
        meta: `KYC: ${candidate.kycStatus}`,
        status: candidate.accountStatus,
      })),
      secondaryListTitle: 'Recent accounts',
      secondaryList: recentUsers.map((candidate) => ({
        id: this.readString(candidate.id, candidate.uid),
        title: this.readString(candidate.fullName, 'User account'),
        subtitle: `${this.readString(candidate.email, 'No email')} - ${Array.isArray(candidate.role) ? candidate.role.join(', ') : 'unknown'}`,
        meta: this.readTimestampLabel(candidate.createdAt, 'Created'),
        status: this.readString(candidate.kycStatus, 'unknown'),
      })),
    };
  }

  // Returns the current session's resolved role and account state for the client app.
  async getSessionStatus(
    userId: string,
    activeRole: UserRole,
  ): Promise<SessionResponseDto> {
    const user = await this.getRequiredUser(userId);
    const roles = this.getRoles(user.role);
    const resolvedRole = roles.includes(activeRole) ? activeRole : roles[0];

    return {
      message: 'Authenticated session is valid.',
      activeRole: resolvedRole,
      availableRoles: roles,
      accountStatus: user.accountStatus,
      kycStatus: user.kycStatus,
      user: this.toSafeUser(user, resolvedRole),
    };
  }

<<<<<<< HEAD
  // Verifies the existing password before writing a fresh hash back to Firestore.
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.getRequiredUser(userId);
    const currentPasswordMatches = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!currentPasswordMatches) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
      throw new BadRequestException(
        'New password must be different from the current password.',
      );
    }

    const passwordHash = await bcrypt.hash(changePasswordDto.newPassword, 10);

    await this.usersCollection.doc(userId).update({
      passwordHash,
      updatedAt: Timestamp.now(),
    });

    return {
      message: 'Password updated successfully.',
    };
  }

=======
  // Shared helper used by other modules that need the full stored user record.
>>>>>>> f77b41fe (add comments)
  async getUserById(userId: string): Promise<UserDocument> {
    return this.getRequiredUser(userId);
  }

  // Keeps the user's top-level KYC status in sync with document review decisions.
  async updateUserKycStatus(
    userId: string,
    kycStatus: KycStatus,
  ): Promise<void> {
    await this.usersCollection.doc(userId).update({
      kycStatus,
      updatedAt: Timestamp.now(),
    });
  }

  private async findUserByIdentifier(
    identifier: string,
  ): Promise<UserDocument | null> {
    const trimmedIdentifier = identifier.trim();

    if (!trimmedIdentifier) {
      throw new BadRequestException('Email or phone is required.');
    }

    if (trimmedIdentifier.includes('@')) {
      // Check normalized email first, then fall back to legacy records.
      const snapshot = await this.usersCollection
        .where('emailLower', '==', this.normalizeEmail(trimmedIdentifier))
        .limit(1)
        .get();

      if (!snapshot.empty) {
        return snapshot.docs[0].data() as UserDocument;
      }

      const legacySnapshot = await this.usersCollection
        .where('email', '==', this.normalizeEmail(trimmedIdentifier))
        .limit(1)
        .get();

      return legacySnapshot.empty
        ? null
        : (legacySnapshot.docs[0].data() as UserDocument);
    }

    const normalizedPhone = this.normalizePhone(trimmedIdentifier);
    // Phone logins follow the same normalized-first, legacy-fallback pattern.
    const snapshot = await this.usersCollection
      .where('phoneNormalized', '==', normalizedPhone)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      return snapshot.docs[0].data() as UserDocument;
    }

    const legacySnapshot = await this.usersCollection
      .where('phone', '==', normalizedPhone)
      .limit(1)
      .get();

    return legacySnapshot.empty
      ? null
      : (legacySnapshot.docs[0].data() as UserDocument);
  }

  // Shapes the user object that is safe to send back to the frontend.
  private toSafeUser(user: UserDocument, roleOverride?: UserRole): SafeUserDto {
    const primaryRole = this.getPrimaryRole(user.role);

    return {
      uid: user.uid,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: roleOverride ?? primaryRole,
      kycStatus: user.kycStatus,
    };
  }

  // Ensures the requested login role is one of the roles assigned to the user.
  private resolveLoginRole(
    user: UserDocument,
    requestedRole?: UserRole,
  ): UserRole {
    const roles = this.getRoles(user.role);

    if (requestedRole) {
      if (!roles.includes(requestedRole)) {
        throw new UnauthorizedException('Invalid credentials.');
      }

      return requestedRole;
    }

    const defaultRole = roles[0];

    if (!defaultRole) {
      throw new UnauthorizedException(
        'This account does not have an assigned role.',
      );
    }

    return defaultRole;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  // Normalizes the stored role field so the rest of the service can treat it as an array.
  private getRoles(role: UserDocument['role']): UserRole[] {
    if (Array.isArray(role)) {
      return role.filter(
        (entry): entry is UserRole =>
          typeof entry === 'string' && USER_ROLES.includes(entry as UserRole),
      );
    }

    return typeof role === 'string' && USER_ROLES.includes(role as UserRole)
      ? [role as UserRole]
      : [];
  }

  private hasRole(role: UserDocument['role'], expectedRole: UserRole): boolean {
    return this.getRoles(role).includes(expectedRole);
  }

  private getPrimaryRole(role: UserDocument['role']): UserRole {
    const primaryRole = this.getRoles(role)[0];

    if (!primaryRole) {
      throw new UnauthorizedException(
        'This account does not have an assigned role.',
      );
    }

    return primaryRole;
  }

  // Converts several phone input styles into a single E.164-like format used by the system.
  private normalizePhone(phone: string): string {
    const raw = phone.trim();

    if (!raw) {
      throw new BadRequestException('Phone number is required.');
    }

    const digitsAndPlus = raw.replace(/[^\d+]/g, '');
    let normalized = digitsAndPlus;

    if (normalized.startsWith('+')) {
      normalized = `+${normalized.slice(1).replace(/\D/g, '')}`;
    } else {
      normalized = normalized.replace(/\D/g, '');

      if (normalized.startsWith('0')) {
        normalized = `+94${normalized.slice(1)}`;
      } else if (normalized.startsWith('94')) {
        normalized = `+${normalized}`;
      } else if (normalized.length === 9) {
        normalized = `+94${normalized}`;
      } else {
        normalized = `+${normalized}`;
      }
    }

    if (!/^\+\d{9,15}$/.test(normalized)) {
      throw new BadRequestException('Please provide a valid phone number.');
    }

    return normalized;
  }

  private async hasExistingEmail(emailLower: string): Promise<boolean> {
    const [normalizedSnapshot, legacySnapshot] = await Promise.all([
      this.usersCollection.where('emailLower', '==', emailLower).limit(1).get(),
      this.usersCollection.where('email', '==', emailLower).limit(1).get(),
    ]);

    return !normalizedSnapshot.empty || !legacySnapshot.empty;
  }

  private async hasExistingPhone(phoneNormalized: string): Promise<boolean> {
    const [normalizedSnapshot, legacySnapshot] = await Promise.all([
      this.usersCollection
        .where('phoneNormalized', '==', phoneNormalized)
        .limit(1)
        .get(),
      this.usersCollection.where('phone', '==', phoneNormalized).limit(1).get(),
    ]);

    return !normalizedSnapshot.empty || !legacySnapshot.empty;
  }

  private async getRequiredUser(userId: string): Promise<UserDocument> {
    const snapshot = await this.usersCollection.doc(userId).get();

    if (!snapshot.exists) {
      throw new NotFoundException('User not found.');
    }

    return snapshot.data() as UserDocument;
  }

  private async getCollectionDocs(
    collectionName: string,
    field: string,
    value: string,
  ): Promise<Array<Record<string, unknown>>> {
    const snapshot = await this.firebaseService.db
      .collection(collectionName)
      .where(field, '==', value)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  // Builds the small metric cards shown on the borrower dashboard.
  private buildBorrowerMetrics(
    user: UserDocument,
    loanDocs: Array<Record<string, unknown>>,
    relationDocs: Array<Record<string, unknown>>,
  ): DashboardMetricDto[] {
    const activeLoans = loanDocs.filter(
      (doc) => doc.status === 'active',
    ).length;
    const totalRepayable = loanDocs.reduce(
      (sum, doc) => sum + this.readNumber(doc.totalRepayable),
      0,
    );

    return [
      this.metric(
        'Credit score',
        String(user.creditScore ?? 0),
        'Current borrower score',
      ),
      this.metric(
        'Active loans',
        String(activeLoans),
        `${loanDocs.length} total loan records`,
      ),
      this.metric(
        'Repayable total',
        this.formatCurrency(totalRepayable),
        'Across visible loan records',
      ),
      this.metric(
        'Lender links',
        String(relationDocs.length),
        'Relationships already established',
      ),
    ];
  }

  private buildLenderMetrics(
    user: UserDocument,
    loanDocs: Array<Record<string, unknown>>,
    relationDocs: Array<Record<string, unknown>>,
    adDocs: Array<Record<string, unknown>>,
  ): DashboardMetricDto[] {
    const activeLoans = loanDocs.filter(
      (doc) => doc.status === 'active',
    ).length;
    const activeAds = adDocs.filter((doc) => doc.status === 'active').length;

    return [
      this.metric(
        'Total lent',
        this.formatCurrency(user.totalAmountLent ?? 0),
        'Tracked from your Firestore profile',
      ),
      this.metric(
        'Completed loans',
        String(user.totalLoansCompleted ?? 0),
        'Closed lending cycles',
      ),
      this.metric(
        'Active loans',
        String(activeLoans),
        `${loanDocs.length} total loan records`,
      ),
      this.metric(
        'Live listings',
        String(activeAds),
        `${relationDocs.length} borrower relationships`,
      ),
    ];
  }

  private toBorrowerLoanItem(
    doc: Record<string, unknown>,
  ): DashboardListItemDto {
    return {
      id: this.readString(doc.id, 'loan'),
      title: `Loan ${this.readString(doc.loanId ?? doc.id, 'loan').slice(0, 8)}`,
      subtitle: `${this.formatCurrency(this.readNumber(doc.principalAmount))} requested for ${this.readNumber(doc.tenureMonths)} months`,
      meta: this.readTimestampLabel(doc.nextDueDate, 'Next due'),
      status: this.readString(doc.status, 'unknown'),
    };
  }

  private toLenderAdItem(doc: Record<string, unknown>): DashboardListItemDto {
    const amount = this.formatCurrency(this.readNumber(doc.maxAmount));
    const interest = this.readNumber(doc.preferredInterestRate);

    return {
      id: this.readString(doc.id, 'ad'),
      title: `${amount} listing`,
      subtitle: `${this.readString(doc.location, 'Sri Lanka')} • ${interest}% preferred interest`,
      meta: this.readTimestampLabel(doc.expiresAt, 'Expires'),
      status: this.readString(doc.status, 'unknown'),
    };
  }

  private toBorrowerRelationItem(
    doc: Record<string, unknown>,
  ): DashboardListItemDto {
    const activeCount = this.readNumber(doc.activeLoanCount);
    const completedCount = this.readNumber(doc.completedLoanCount);

    return {
      id: this.readString(doc.id, 'relation'),
      title: this.readString(doc.lenderName, 'Lender connection'),
      subtitle: `${activeCount} active loans • ${completedCount} completed loans`,
      meta: this.formatCurrency(this.readNumber(doc.totalPrincipalAmount)),
      status: this.readString(doc.latestLoanStatus, 'unknown'),
    };
  }

  private toLenderRelationItem(
    doc: Record<string, unknown>,
  ): DashboardListItemDto {
    const totalLoans = this.readNumber(doc.totalLoans);

    return {
      id: this.readString(doc.id, 'relation'),
      title: this.readString(doc.borrowerName, 'Borrower connection'),
      subtitle: `Credit score ${this.readNumber(doc.borrowerCreditScore)} • ${totalLoans} loans`,
      meta: this.formatCurrency(this.readNumber(doc.totalPrincipalAmount)),
      status: this.readString(doc.latestLoanStatus, 'unknown'),
    };
  }

  private metric(
    label: string,
    value: string,
    helper: string,
  ): DashboardMetricDto {
    return {
      label,
      value,
      helper,
    };
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      maximumFractionDigits: 0,
    }).format(value || 0);
  }

  private readNumber(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private readString(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value : fallback;
  }

  private readTimestampLabel(value: unknown, prefix: string): string {
    const iso = this.toIsoString(value);
    return iso
      ? `${prefix}: ${new Date(iso).toLocaleDateString('en-LK')}`
      : `${prefix}: not set`;
  }

  private toIsoString(value: unknown): string | null {
    if (!value) {
      return null;
    }

    if (
      typeof value === 'object' &&
      'toDate' in value &&
      typeof (value as Timestamp).toDate === 'function'
    ) {
      return (value as Timestamp).toDate().toISOString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }

    return null;
  }

  private sortByTimestamp<T extends Record<string, unknown>>(
    docs: T[],
    field: string,
  ): T[] {
    return docs
      .slice()
      .sort(
        (left, right) =>
          this.toMillis(right[field]) - this.toMillis(left[field]),
      );
  }

  private toMillis(value: unknown): number {
    if (
      value &&
      typeof value === 'object' &&
      'toMillis' in value &&
      typeof (value as { toMillis?: () => number }).toMillis === 'function'
    ) {
      return (value as { toMillis: () => number }).toMillis();
    }

    if (
      value &&
      typeof value === 'object' &&
      'toDate' in value &&
      typeof (value as Timestamp).toDate === 'function'
    ) {
      return (value as Timestamp).toDate().getTime();
    }

    if (value instanceof Date) {
      return value.getTime();
    }

    if (typeof value === 'string') {
      const parsed = new Date(value).getTime();
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    return 0;
  }
}
