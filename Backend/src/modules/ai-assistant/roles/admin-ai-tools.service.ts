import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AggregateField,
  type DocumentData,
  type DocumentSnapshot,
  type Query,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import type { AiToolDefinition } from '../ai-assistant.types';
import { readNumber, readString, toIso } from './ai-data.utils';

const USER_ROLES = ['admin', 'borrower', 'lender'] as const;
const ACCOUNT_STATUSES = ['pending', 'active', 'suspended', 'closed'] as const;
const KYC_STATUSES = ['pending', 'approved', 'rejected'] as const;
const LISTING_STATUSES = [
  'draft',
  'pending',
  'pending_review',
  'active',
  'paused',
  'rejected',
  'expired',
  'closed',
] as const;
const TRANSACTION_STATUSES = [
  'pending',
  'completed',
  'failed',
  'reversed',
] as const;
const DISPUTE_STATUSES = [
  'open',
  'under_review',
  'awaiting_response',
  'resolved',
  'rejected',
  'closed',
] as const;
const LEGAL_STATUSES = ['draft', 'published', 'archived'] as const;

@Injectable()
export class AdminAiToolsService {
  private static readonly LIST_LIMIT = 10;

  constructor(private readonly firebaseService: FirebaseService) {}

  getDefinitions(): AiToolDefinition[] {
    const noArguments = {
      type: 'object' as const,
      properties: {},
      required: [],
      additionalProperties: false as const,
    };

    return [
      this.tool(
        'get_admin_dashboard',
        'Get sanitized platform-wide operational counts for the authenticated admin.',
        noArguments,
      ),
      this.tool(
        'search_admin_users',
        'Find up to 10 sanitized user summaries by optional text, role, and account status.',
        {
          type: 'object',
          properties: {
            search: this.nullableString(
              'Optional user ID, exact email, or name text.',
            ),
            role: this.nullableEnum(USER_ROLES, 'Optional account role.'),
            status: this.nullableEnum(
              ACCOUNT_STATUSES,
              'Optional account status.',
            ),
          },
          required: ['search', 'role', 'status'],
          additionalProperties: false,
        },
      ),
      this.tool(
        'get_admin_user_summary',
        'Get one sanitized user status and related record counts without contact or credential data.',
        this.idParameters('userId', 'User document ID.'),
      ),
      this.tool(
        'list_admin_kyc_submissions',
        'List up to 10 recent sanitized KYC submissions, optionally filtered by status.',
        this.optionalStatusParameters(KYC_STATUSES),
      ),
      this.tool(
        'list_admin_loan_listings',
        'List up to 10 recent sanitized loan listings, optionally filtered by status.',
        this.optionalStatusParameters(LISTING_STATUSES),
      ),
      this.tool(
        'get_admin_loan_portfolio',
        'Get platform-wide loan counts and integer minor-unit portfolio totals by status.',
        noArguments,
      ),
      this.tool(
        'list_admin_transactions',
        'List up to 10 recent sanitized ledger transactions, optionally filtered by status.',
        this.optionalStatusParameters(TRANSACTION_STATUSES),
      ),
      this.tool(
        'list_admin_disputes',
        'List up to 10 recent sanitized dispute cases, optionally filtered by status.',
        this.optionalStatusParameters(DISPUTE_STATUSES),
      ),
      this.tool(
        'list_admin_legal_documents',
        'List up to 10 legal document versions without returning their full content.',
        this.optionalStatusParameters(LEGAL_STATUSES),
      ),
      this.tool(
        'list_admin_audit_activity',
        'List up to 10 recent sanitized immutable audit events.',
        noArguments,
      ),
    ];
  }

  execute(
    _adminId: string,
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    switch (name) {
      case 'get_admin_dashboard':
        return this.getDashboard();
      case 'search_admin_users':
        return this.searchUsers(args);
      case 'get_admin_user_summary':
        return this.getUserSummary(this.requiredId(args, 'userId'));
      case 'list_admin_kyc_submissions':
        return this.listKycSubmissions(this.optionalString(args.status));
      case 'list_admin_loan_listings':
        return this.listLoanListings(this.optionalString(args.status));
      case 'get_admin_loan_portfolio':
        return this.getLoanPortfolio();
      case 'list_admin_transactions':
        return this.listTransactions(this.optionalString(args.status));
      case 'list_admin_disputes':
        return this.listDisputes(this.optionalString(args.status));
      case 'list_admin_legal_documents':
        return this.listLegalDocuments(this.optionalString(args.status));
      case 'list_admin_audit_activity':
        return this.listAuditActivity();
      default:
        throw new NotFoundException(
          `Admin assistant tool ${name} is not available.`,
        );
    }
  }

  private get db() {
    return this.firebaseService.getDb();
  }

  private tool(
    name: string,
    description: string,
    parameters: AiToolDefinition['parameters'],
  ): AiToolDefinition {
    return { type: 'function', name, description, strict: true, parameters };
  }

  private nullableString(description: string) {
    return { type: ['string', 'null'], description };
  }

  private nullableEnum(values: readonly string[], description: string) {
    return { type: ['string', 'null'], enum: [...values, null], description };
  }

  private optionalStatusParameters(
    values: readonly string[],
  ): AiToolDefinition['parameters'] {
    return {
      type: 'object',
      properties: {
        status: this.nullableEnum(values, 'Optional lowercase status filter.'),
      },
      required: ['status'],
      additionalProperties: false,
    };
  }

  private idParameters(
    name: string,
    description: string,
  ): AiToolDefinition['parameters'] {
    return {
      type: 'object',
      properties: { [name]: { type: 'string', description } },
      required: [name],
      additionalProperties: false,
    };
  }

  private requiredId(args: Record<string, unknown>, key: string): string {
    const value = readString(args[key]);
    if (!value) throw new BadRequestException(`${key} is required.`);
    return value;
  }

  private optionalString(value: unknown): string | null {
    return readString(value).trim().toLowerCase() || null;
  }

  private async getCount(query: Query<DocumentData>): Promise<number> {
    const snapshot = await query.count().get();
    return snapshot.data().count;
  }

  private async recentDocuments(
    collectionName: string,
    status: string | null,
    dateField: string,
  ): Promise<QueryDocumentSnapshot<DocumentData>[]> {
    const collection = this.db.collection(collectionName);
    let query: Query<DocumentData> = collection;
    if (status) query = query.where('status', '==', status);

    try {
      const snapshot = await query
        .orderBy(dateField, 'desc')
        .limit(AdminAiToolsService.LIST_LIMIT)
        .get();
      return snapshot.docs;
    } catch (error) {
      if (!status || !this.requiresCompositeIndex(error)) throw error;
      const fallback = await collection
        .where('status', '==', status)
        .limit(50)
        .get();
      return fallback.docs
        .sort((left, right) =>
          String(toIso(right.get(dateField))).localeCompare(
            String(toIso(left.get(dateField))),
          ),
        )
        .slice(0, AdminAiToolsService.LIST_LIMIT);
    }
  }

  private requiresCompositeIndex(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const candidate = error as { code?: unknown; message?: unknown };
    const message =
      typeof candidate.message === 'string' ? candidate.message : '';
    return (
      candidate.code === 9 ||
      message.toLowerCase().includes('requires an index')
    );
  }

  private async getDashboard() {
    const users = this.db.collection('users');
    const loans = this.db.collection('loans');
    const transactions = this.db.collection('transactions');
    const disputes = this.db.collection('disputes');
    const listings = this.db.collection('loanListings');
    const [
      totalUsers,
      activeUsers,
      pendingUsers,
      suspendedUsers,
      totalLoans,
      activeLoans,
      overdueLoans,
      totalTransactions,
      completedTransactions,
      failedTransactions,
      openDisputes,
      reviewingDisputes,
      pendingKyc,
      pendingListings,
      legacyPendingListings,
    ] = await Promise.all([
      this.getCount(users),
      this.getCount(users.where('accountStatus', '==', 'active')),
      this.getCount(users.where('accountStatus', '==', 'pending')),
      this.getCount(users.where('accountStatus', '==', 'suspended')),
      this.getCount(loans),
      this.getCount(loans.where('status', '==', 'active')),
      this.getCount(loans.where('status', '==', 'overdue')),
      this.getCount(transactions),
      this.getCount(transactions.where('status', '==', 'completed')),
      this.getCount(transactions.where('status', '==', 'failed')),
      this.getCount(disputes.where('status', '==', 'open')),
      this.getCount(disputes.where('status', '==', 'under_review')),
      this.getCount(users.where('kycStatus', '==', 'pending')),
      this.getCount(listings.where('status', '==', 'pending_review')),
      this.getCount(listings.where('status', '==', 'pending')),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        pending: pendingUsers,
        suspended: suspendedUsers,
      },
      loans: { total: totalLoans, active: activeLoans, overdue: overdueLoans },
      transactions: {
        total: totalTransactions,
        completed: completedTransactions,
        failed: failedTransactions,
      },
      disputes: { open: openDisputes, underReview: reviewingDisputes },
      pendingKycSubmissions: pendingKyc,
      pendingLoanListings: pendingListings + legacyPendingListings,
    };
  }

  private readRoles(data: DocumentData): string[] {
    const value: unknown = data.roles ?? data.role;
    if (Array.isArray(value)) {
      return value.filter((role): role is string => typeof role === 'string');
    }
    return typeof value === 'string' ? [value] : [];
  }

  private accountStatus(data: DocumentData): string {
    return readString(
      data.accountStatus,
      readString(data.status, 'active'),
    ).toLowerCase();
  }

  private mapUser(doc: DocumentSnapshot<DocumentData>) {
    const data = doc.data() ?? {};
    return {
      userId: readString(data.userId, doc.id),
      fullName: readString(data.fullName, 'User'),
      roles: this.readRoles(data),
      accountStatus: this.accountStatus(data),
      kycStatus: readString(data.kycStatus, 'not_submitted').toLowerCase(),
      createdAt: toIso(data.createdAt),
    };
  }

  private async searchUsers(args: Record<string, unknown>) {
    const search = readString(args.search).trim().toLowerCase();
    const role = this.optionalString(args.role);
    const status = this.optionalString(args.status);
    const recentPromise = this.db
      .collection('users')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    const exactIdPromise = search
      ? this.db.collection('users').doc(readString(args.search).trim()).get()
      : null;
    const exactEmailPromise = search
      ? this.db.collection('users').where('email', '==', search).limit(10).get()
      : null;
    const [recent, exactId, exactEmail] = await Promise.all([
      recentPromise,
      exactIdPromise,
      exactEmailPromise,
    ]);
    const documents = new Map<string, DocumentSnapshot<DocumentData>>();
    recent.docs.forEach((doc) => documents.set(doc.id, doc));
    exactEmail?.docs.forEach((doc) => documents.set(doc.id, doc));
    if (exactId?.exists) {
      documents.set(exactId.id, exactId);
    }

    return Array.from(documents.values())
      .filter((doc) => {
        const data = doc.data() ?? {};
        if (role && !this.readRoles(data).includes(role)) return false;
        if (status && this.accountStatus(data) !== status) return false;
        if (!search) return true;
        return [doc.id, data.userId, data.fullName, data.email]
          .filter((value): value is string => typeof value === 'string')
          .some((value) => value.toLowerCase().includes(search));
      })
      .slice(0, AdminAiToolsService.LIST_LIMIT)
      .map((doc) => this.mapUser(doc));
  }

  private async getUserSummary(userId: string) {
    const user = await this.db.collection('users').doc(userId).get();
    if (!user.exists)
      throw new NotFoundException('No matching user was found.');
    const [
      borrowedLoans,
      fundedLoans,
      borrowerApplications,
      lenderApplications,
      complaints,
      responses,
    ] = await Promise.all([
      this.getCount(
        this.db.collection('loans').where('borrowerId', '==', userId),
      ),
      this.getCount(
        this.db.collection('loans').where('lenderId', '==', userId),
      ),
      this.getCount(
        this.db
          .collection('loanApplications')
          .where('borrowerId', '==', userId),
      ),
      this.getCount(
        this.db.collection('loanApplications').where('lenderId', '==', userId),
      ),
      this.getCount(
        this.db.collection('disputes').where('complainantId', '==', userId),
      ),
      this.getCount(
        this.db.collection('disputes').where('respondentId', '==', userId),
      ),
    ]);
    const data = user.data() ?? {};
    return {
      userId: readString(data.userId, user.id),
      fullName: readString(data.fullName, 'User'),
      roles: this.readRoles(data),
      accountStatus: this.accountStatus(data),
      kycStatus: readString(data.kycStatus, 'not_submitted').toLowerCase(),
      createdAt: toIso(data.createdAt),
      relatedRecordCounts: {
        borrowedLoans,
        fundedLoans,
        borrowerApplications,
        lenderApplications,
        disputes: complaints + responses,
      },
    };
  }

  private async listKycSubmissions(status: string | null) {
    const users = this.db.collection('users');
    const query = status ? users.where('kycStatus', '==', status) : users;
    const snapshot = await query.limit(50).get();

    return snapshot.docs
      .map((doc) => {
        const data = doc.data();
        const kycStatus = readString(
          data.kycStatus,
          'not_submitted',
        ).toLowerCase();
        const roles = Array.isArray(data.roles) ? data.roles : [];
        const submittedAt =
          data.kycFiles && typeof data.kycFiles === 'object'
            ? (data.kycFiles as Record<string, unknown>).submittedAt
            : undefined;

        return {
          submissionId: doc.id,
          userId: readString(data.userId, readString(data.uid, doc.id)),
          role: readString(data.primaryRole, readString(roles[0])),
          status: kycStatus,
          submittedAt: toIso(submittedAt ?? data.updatedAt),
          reviewedAt:
            kycStatus === 'approved' || kycStatus === 'rejected'
              ? toIso(data.updatedAt)
              : null,
        };
      })
      .filter((submission) => KYC_STATUSES.includes(submission.status as never))
      .sort((left, right) =>
        String(right.submittedAt).localeCompare(String(left.submittedAt)),
      )
      .slice(0, AdminAiToolsService.LIST_LIMIT);
  }

  private async listLoanListings(status: string | null) {
    const documents = await this.recentDocuments(
      'loanListings',
      status,
      'createdAt',
    );
    return documents.map((doc) => {
      const data = doc.data();
      return {
        listingId: readString(data.listingId, readString(data.adId, doc.id)),
        lenderId: readString(data.lenderId),
        title: readString(data.title, 'Loan listing'),
        status: readString(data.status, 'draft').toLowerCase(),
        minAmountMinor: readNumber(
          data.minAmountMinor,
          readNumber(data.minAmount),
        ),
        maxAmountMinor: readNumber(
          data.maxAmountMinor,
          readNumber(data.maxAmount),
        ),
        currency: readString(data.currency, 'LKR'),
        createdAt: toIso(data.createdAt),
        expiresAt: toIso(data.expiresAt),
      };
    });
  }

  private async portfolioFor(query: Query<DocumentData>) {
    const snapshot = await query
      .aggregate({
        count: AggregateField.count(),
        principalMinor: AggregateField.sum('principalMinor'),
        outstandingMinor: AggregateField.sum('remainingBalanceMinor'),
      })
      .get();
    return snapshot.data();
  }

  private async getLoanPortfolio() {
    const loans = this.db.collection('loans');
    const [total, active, overdue, completed, defaulted] = await Promise.all([
      this.portfolioFor(loans),
      this.portfolioFor(loans.where('status', '==', 'active')),
      this.portfolioFor(loans.where('status', '==', 'overdue')),
      this.portfolioFor(loans.where('status', '==', 'completed')),
      this.portfolioFor(loans.where('status', '==', 'defaulted')),
    ]);
    return { currency: 'LKR', total, active, overdue, completed, defaulted };
  }

  private async listTransactions(status: string | null) {
    const documents = await this.recentDocuments(
      'transactions',
      status,
      'createdAt',
    );
    return documents.map((doc) => {
      const data = doc.data();
      return {
        transactionId: readString(data.transactionId, doc.id),
        type: readString(data.type, 'unknown').toLowerCase(),
        status: readString(data.status, 'pending').toLowerCase(),
        amountMinor: readNumber(data.amountMinor, readNumber(data.amount)),
        currency: readString(data.currency, 'LKR'),
        loanId: readString(data.loanId) || null,
        createdAt: toIso(data.createdAt),
        completedAt: toIso(data.completedAt),
      };
    });
  }

  private async listDisputes(status: string | null) {
    const documents = await this.recentDocuments(
      'disputes',
      status,
      'updatedAt',
    );
    return documents.map((doc) => {
      const data = doc.data();
      return {
        disputeId: readString(data.disputeId, doc.id),
        category: readString(data.category, 'other').toLowerCase(),
        status: readString(data.status, 'open').toLowerCase(),
        loanId: readString(data.loanId) || null,
        assignedAdminId: readString(data.assignedAdminId) || null,
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
        resolvedAt: toIso(data.resolvedAt),
      };
    });
  }

  private async listLegalDocuments(status: string | null) {
    const documents = await this.recentDocuments(
      'legalDocuments',
      status,
      'createdAt',
    );
    return documents.map((doc) => {
      const data = doc.data();
      return {
        legalDocumentId: readString(data.legalDocumentId, doc.id),
        type: readString(data.type),
        version: readNumber(data.version),
        title: readString(data.title, 'Legal document'),
        status: readString(data.status, 'draft').toLowerCase(),
        publishedAt: toIso(data.publishedAt),
        createdAt: toIso(data.createdAt),
      };
    });
  }

  private async listAuditActivity() {
    const snapshot = await this.db
      .collection('auditLogs')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        auditLogId: readString(data.auditLogId, doc.id),
        actorRole: readString(data.actorRole, 'system').toLowerCase(),
        action: readString(data.action, 'unknown'),
        entityType: readString(data.entityType, 'unknown'),
        entityId: readString(data.entityId) || null,
        createdAt: toIso(data.createdAt),
      };
    });
  }
}
