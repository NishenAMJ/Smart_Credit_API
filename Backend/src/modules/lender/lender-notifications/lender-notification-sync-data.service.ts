import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DocumentData,
  Firestore,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import {
  chunkValues,
  dedupeById,
  hasRole,
  readDate,
  readNumber,
  readStringArray,
} from '../../../firebase/firestore-query.utils';
import {
  computeLoanRemainingAmount,
  getAdStatus,
  getLoanAmount,
  getLoanCreatedAt,
  getNormalizedInstallment,
} from '../../../firebase/firestore-seed.utils';
import type {
  AdRecord,
  BorrowerProfile,
  DisputeRecord,
  LenderProfile,
  LoanRecord,
  NotificationGenerationPreferences,
  RequestRecord,
  TransactionRecord,
} from './lender-notification-sync.models';

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationGenerationPreferences = {
  inAppNewRequests: true,
  inAppTransactions: true,
  inAppStatusUpdates: true,
  inAppOverdues: true,
  inAppAdExpiry: true,
  inAppDisputes: true,
};

export type LenderNotificationSyncContext = {
  lenderProfile: LenderProfile;
  preferences: NotificationGenerationPreferences;
  loans: LoanRecord[];
  ads: AdRecord[];
  requests: RequestRecord[];
  transactions: TransactionRecord[];
  disputes: DisputeRecord[];
  overdueMap: Map<string, Date>;
  borrowerMap: Map<string, BorrowerProfile>;
  loanMap: Map<string, LoanRecord>;
};

@Injectable()
export class LenderNotificationSyncDataService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async load(lenderId: string): Promise<LenderNotificationSyncContext> {
    const db = this.firebaseService.getDb();
    const [lenderProfile, preferences, syncCursor] = await Promise.all([
      this.getLenderProfile(lenderId),
      this.getNotificationPreferences(lenderId),
      this.getLastSyncedAt(lenderId),
    ]);
    const [loansSnapshot, adsSnapshot] = await Promise.all([
      db.collection('loans').where('lenderId', '==', lenderId).get(),
      db.collection('loanListings').where('lenderId', '==', lenderId).get(),
    ]);
    const loans = await Promise.all(
      loansSnapshot.docs.map((doc) => this.mapLoan(db, doc)),
    );
    const ads = adsSnapshot.docs.map((doc) => this.mapAd(doc));
    const loanMap = new Map(loans.map((loan) => [loan.id, loan]));
    const loanIds = new Set(loans.map((loan) => loan.id));
    const adIds = new Set(ads.map((ad) => ad.id));
    const [requests, transactions, disputes, overdueMap] = await Promise.all([
      this.getRequestsForLender(db, lenderId, adIds, syncCursor),
      this.getTransactionsForLender(db, lenderId, loanIds, syncCursor),
      this.getDisputesForLender(db, lenderId, loanIds, syncCursor),
      this.getOverdueLoanMap(lenderId, loans, syncCursor),
    ]);
    const borrowerMap = await this.getBorrowerMap([
      ...loans
        .map((loan) => loan.borrowerId)
        .filter((id): id is string => Boolean(id)),
      ...requests
        .map((request) => request.borrowerId)
        .filter((id): id is string => Boolean(id)),
    ]);

    return {
      lenderProfile,
      preferences,
      loans,
      ads,
      requests,
      transactions,
      disputes,
      overdueMap,
      borrowerMap,
      loanMap,
    };
  }

  private async getLastSyncedAt(lenderId: string): Promise<Date | null> {
    const snapshot = await this.firebaseService
      .getDb()
      .collection('lenderNotificationSync')
      .doc(lenderId)
      .get();

    return this.toDate(snapshot.data()?.lastSyncedAt);
  }

  private async getRequestsForLender(
    db: Firestore,
    lenderId: string,
    adIds: Set<string>,
    lastSyncedAt: Date | null,
  ): Promise<RequestRecord[]> {
    const baseQueries = [
      db.collection('loanApplications').where('lenderId', '==', lenderId),
      ...chunkValues(Array.from(adIds), 10).map((listingIds) =>
        db.collection('loanApplications').where('listingId', 'in', listingIds),
      ),
    ];

    const snapshots = await Promise.all(
      baseQueries.map((query) =>
        lastSyncedAt
          ? query.where('updatedAt', '>=', lastSyncedAt).get()
          : query.get(),
      ),
    );

    return dedupeById(
      snapshots.flatMap((snapshot) =>
        snapshot.docs.map((doc) => this.mapRequest(doc)),
      ),
    ).filter(
      (request) =>
        request.targetLenderId === lenderId ||
        (request.adId ? adIds.has(request.adId) : false),
    );
  }

  private async getTransactionsForLender(
    db: Firestore,
    lenderId: string,
    loanIds: Set<string>,
    lastSyncedAt: Date | null,
  ): Promise<TransactionRecord[]> {
    if (loanIds.size === 0) {
      return [];
    }

    const lenderScopedQuery = db
      .collection('transactions')
      .where('lenderId', '==', lenderId);

    try {
      const snapshot = await (lastSyncedAt
        ? lenderScopedQuery.where('createdAt', '>=', lastSyncedAt).get()
        : lenderScopedQuery.get());

      if (snapshot.size > 0) {
        return snapshot.docs
          .map((doc) => this.mapTransaction(doc))
          .filter((transaction) =>
            transaction.loanId ? loanIds.has(transaction.loanId) : false,
          );
      }
    } catch {
      // Fall back to loan-scoped transaction queries below.
    }

    const snapshots = await Promise.all(
      chunkValues(Array.from(loanIds), 10).map((loanIdChunk) =>
        db.collection('transactions').where('loanId', 'in', loanIdChunk).get(),
      ),
    );

    const topLevelTransactions = dedupeById(
      snapshots
        .flatMap((snapshot) => snapshot.docs)
        .map((doc) => this.mapTransaction(doc))
        .filter((transaction) =>
          transaction.loanId ? loanIds.has(transaction.loanId) : false,
        )
        .filter((transaction) =>
          lastSyncedAt && transaction.createdAt
            ? transaction.createdAt >= lastSyncedAt
            : true,
        ),
    );

    if (topLevelTransactions.length > 0) {
      return topLevelTransactions;
    }

    return this.getNestedPaymentTransactions(
      db,
      Array.from(loanIds),
      lastSyncedAt,
    );
  }

  private async getDisputesForLender(
    db: Firestore,
    lenderId: string,
    loanIds: Set<string>,
    lastSyncedAt: Date | null,
  ): Promise<DisputeRecord[]> {
    const lenderScopedQuery = db
      .collection('disputes')
      .where('lenderId', '==', lenderId);

    try {
      const snapshot = await (lastSyncedAt
        ? lenderScopedQuery.where('updatedAt', '>=', lastSyncedAt).get()
        : lenderScopedQuery.get());

      if (snapshot.size > 0) {
        return snapshot.docs
          .map((doc) => this.mapDispute(doc))
          .filter(
            (dispute) =>
              !dispute.loanId || loanIds.has(dispute.loanId),
          );
      }
    } catch {
      // Fall back to loan-scoped dispute queries below.
    }

    if (loanIds.size === 0) {
      return [];
    }

    const snapshots = await Promise.all(
      chunkValues(Array.from(loanIds), 10).map((loanIdChunk) =>
        db.collection('disputes').where('loanId', 'in', loanIdChunk).get(),
      ),
    );

    return dedupeById(
      snapshots
        .flatMap((snapshot) => snapshot.docs)
        .map((doc) => this.mapDispute(doc))
        .filter((dispute) =>
          dispute.loanId ? loanIds.has(dispute.loanId) : false,
        )
        .filter((dispute) =>
          lastSyncedAt && (dispute.updatedAt ?? dispute.createdAt)
            ? (dispute.updatedAt ?? dispute.createdAt)! >= lastSyncedAt
            : true,
        ),
    );
  }

  private async getNotificationPreferences(
    lenderId: string,
  ): Promise<NotificationGenerationPreferences> {
    const snapshot = await this.firebaseService
      .getDb()
      .collection('lenderSettings')
      .doc(lenderId)
      .get();
    const data = snapshot.data();
    const notifications =
      data && typeof data.notifications === 'object' && data.notifications
        ? (data.notifications as Record<string, unknown>)
        : {};

    return {
      inAppNewRequests: this.readBoolean(
        notifications.inAppNewRequests,
        DEFAULT_NOTIFICATION_PREFERENCES.inAppNewRequests,
      ),
      inAppTransactions: this.readBoolean(
        notifications.inAppTransactions,
        DEFAULT_NOTIFICATION_PREFERENCES.inAppTransactions,
      ),
      inAppStatusUpdates: this.readBoolean(
        notifications.inAppStatusUpdates,
        DEFAULT_NOTIFICATION_PREFERENCES.inAppStatusUpdates,
      ),
      inAppOverdues: this.readBoolean(
        notifications.inAppOverdues,
        DEFAULT_NOTIFICATION_PREFERENCES.inAppOverdues,
      ),
      inAppAdExpiry: this.readBoolean(
        notifications.inAppAdExpiry,
        DEFAULT_NOTIFICATION_PREFERENCES.inAppAdExpiry,
      ),
      inAppDisputes: this.readBoolean(
        notifications.inAppDisputes,
        DEFAULT_NOTIFICATION_PREFERENCES.inAppDisputes,
      ),
    };
  }

  private async getLenderProfile(lenderId: string): Promise<LenderProfile> {
    const snapshot = await this.firebaseService
      .getDb()
      .collection('users')
      .doc(lenderId)
      .get();

    if (!snapshot.exists) {
      throw new NotFoundException(`Lender ${lenderId} was not found.`);
    }

    const data = snapshot.data();

    if (!data || !hasRole(data.roles ?? data.role, 'lender')) {
      throw new NotFoundException(`Lender ${lenderId} was not found.`);
    }

    const lenderProfile =
      data.lenderProfile && typeof data.lenderProfile === 'object'
        ? (data.lenderProfile as Record<string, unknown>)
        : {};

    return {
      fullName:
        typeof data.fullName === 'string' && data.fullName.trim().length > 0
          ? data.fullName
          : lenderId,
      businessName:
        typeof lenderProfile.businessName === 'string' &&
        lenderProfile.businessName.trim().length > 0
          ? lenderProfile.businessName
          : typeof data.businessName === 'string' &&
              data.businessName.trim().length > 0
            ? data.businessName
            : null,
      email: typeof data.email === 'string' ? data.email : '',
      city:
        typeof data.city === 'string' && data.city.trim().length > 0
          ? data.city
          : null,
      district:
        typeof data.district === 'string' && data.district.trim().length > 0
          ? data.district
          : null,
      kycStatus:
        typeof data.kycStatus === 'string' ? data.kycStatus : 'not_submitted',
    };
  }

  private async getBorrowerMap(
    borrowerIds: string[],
  ): Promise<Map<string, BorrowerProfile>> {
    const uniqueBorrowerIds = Array.from(new Set(borrowerIds));

    if (uniqueBorrowerIds.length === 0) {
      return new Map<string, BorrowerProfile>();
    }

    const db = this.firebaseService.getDb();
    const snapshots = await db.getAll(
      ...uniqueBorrowerIds.map((borrowerId) =>
        db.collection('users').doc(borrowerId),
      ),
    );

    return new Map(
      snapshots.map((snapshot) => {
        const data = snapshot.data();
        return [
          snapshot.id,
          {
            fullName:
              data &&
              typeof data.fullName === 'string' &&
              data.fullName.trim().length > 0
                ? data.fullName
                : snapshot.id,
          } satisfies BorrowerProfile,
        ] as const;
      }),
    );
  }

  private async getOverdueLoanMap(
    lenderId: string,
    loans: LoanRecord[],
    lastSyncedAt: Date | null,
  ): Promise<Map<string, Date>> {
    const db = this.firebaseService.getDb();

    if (loans.length === 0) {
      return new Map<string, Date>();
    }

    try {
      let query = db
        .collectionGroup('installments')
        .where('lenderId', '==', lenderId)
        .where('status', '==', 'overdue');

      if (lastSyncedAt) {
        query = query.where('updatedAt', '>=', lastSyncedAt);
      }

      const snapshot = await query.get();

      if (!snapshot.empty) {
        return new Map(
          snapshot.docs
            .map((doc) => {
              const data = doc.data();
              const loanId =
                typeof data.loanId === 'string' ? data.loanId : null;
              if (!loanId) {
                return null;
              }

              const createdAt =
                this.toDate(data.updatedAt) ??
                this.toDate(data.dueDate) ??
                this.toDate(data.createdAt) ??
                new Date();

              return [loanId, createdAt] as const;
            })
            .filter(
              (entry): entry is readonly [string, Date] => entry !== null,
            ),
        );
      }
    } catch {
      // Fall back to traversing lender loan installments below.
    }

    const results = await Promise.all(
      loans.map(async (loan) => {
        const snapshot = await db
          .collection('loans')
          .doc(loan.id)
          .collection('installments')
          .get();

        const overdueInstallment = snapshot.docs.find((doc) => {
          const installment = getNormalizedInstallment(doc.data());
          return installment.status === 'overdue';
        });

        if (!overdueInstallment) {
          return null;
        }

        const data = overdueInstallment.data();
        const createdAt =
          this.toDate(data.updatedAt) ??
          this.toDate(data.dueDate) ??
          this.toDate(data.createdAt) ??
          loan.updatedAt ??
          loan.createdAt ??
          new Date();

        if (lastSyncedAt && createdAt < lastSyncedAt) {
          return null;
        }

        return [loan.id, createdAt] as const;
      }),
    );

    return new Map(
      results.filter(
        (entry): entry is readonly [string, Date] => entry !== null,
      ),
    );
  }

  private async mapLoan(
    db: Firestore,
    doc: QueryDocumentSnapshot<DocumentData>,
  ): Promise<LoanRecord> {
    const data = doc.data();

    return {
      id: doc.id,
      borrowerId: typeof data.borrowerId === 'string' ? data.borrowerId : null,
      requestId: typeof data.requestId === 'string' ? data.requestId : null,
      amount: getLoanAmount(data),
      remainingAmount: await computeLoanRemainingAmount(db, doc.id, data),
      status: typeof data.status === 'string' ? data.status : 'unknown',
      createdAt: getLoanCreatedAt(data),
      updatedAt: this.toDate(data.updatedAt),
    };
  }

  private mapRequest(doc: QueryDocumentSnapshot<DocumentData>): RequestRecord {
    const data = doc.data();

    return {
      id:
        typeof data.requestId === 'string' && data.requestId.trim().length > 0
          ? data.requestId
          : doc.id,
      borrowerId: typeof data.borrowerId === 'string' ? data.borrowerId : null,
      adId:
        typeof data.adId === 'string'
          ? data.adId
          : typeof data.listingId === 'string'
            ? data.listingId
            : null,
      targetLenderId:
        typeof data.targetLenderId === 'string'
          ? data.targetLenderId
          : typeof data.lenderId === 'string'
            ? data.lenderId
            : null,
      amount: this.toNumber(data.amount),
      status: typeof data.status === 'string' ? data.status : 'unknown',
      urgency: typeof data.urgency === 'string' ? data.urgency : 'medium',
      purpose: typeof data.purpose === 'string' ? data.purpose : null,
      matchedLenderIds: readStringArray(data.matchedLenderIds),
      createdAt: this.toDate(data.createdAt),
      updatedAt: this.toDate(data.updatedAt),
    };
  }

  private mapTransaction(
    doc: QueryDocumentSnapshot<DocumentData>,
  ): TransactionRecord {
    const data = doc.data();

    return {
      id: doc.id,
      loanId: typeof data.loanId === 'string' ? data.loanId : null,
      type:
        typeof data.type === 'string'
          ? data.type
          : typeof data.paymentType === 'string'
            ? data.paymentType
            : 'unknown',
      amount: this.toNumber(data.amountMinor) / 100,
      status: typeof data.status === 'string' ? data.status : 'recorded',
      createdAt: this.toDate(data.createdAt ?? data.paidAt),
    };
  }

  private mapDispute(doc: QueryDocumentSnapshot<DocumentData>): DisputeRecord {
    const data = doc.data();

    return {
      id: doc.id,
      loanId: typeof data.loanId === 'string' ? data.loanId : null,
      type: typeof data.type === 'string' ? data.type : 'other',
      status: typeof data.status === 'string' ? data.status : 'unknown',
      createdAt: this.toDate(data.createdAt),
      updatedAt: this.toDate(data.updatedAt),
    };
  }

  private mapAd(doc: QueryDocumentSnapshot<DocumentData>): AdRecord {
    const data = doc.data();

    return {
      id: doc.id,
      title:
        typeof data.title === 'string' && data.title.trim().length > 0
          ? data.title
          : `Ad ${doc.id}`,
      status: getAdStatus(data),
      expiresAt: this.toDate(data.expiresAt),
      createdAt: this.toDate(data.createdAt),
      updatedAt: this.toDate(data.updatedAt),
    };
  }

  private readBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
  }

  private toDate(value: unknown): Date | null {
    return readDate(value);
  }

  private toNumber(value: unknown): number {
    return readNumber(value);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private async getNestedPaymentTransactions(
    db: Firestore,
    loanIds: string[],
    lastSyncedAt: Date | null,
  ): Promise<TransactionRecord[]> {
    const groups = await Promise.all(
      chunkValues(loanIds, 10).map((ids) =>
        db
          .collection('transactions')
          .where('loanId', 'in', ids)
          .where('type', '==', 'repayment')
          .get(),
      ),
    );
    return dedupeById(
      groups
        .flatMap((snapshot) => snapshot.docs)
        .map((doc) => this.mapTransaction(doc))
        .filter((payment) =>
          lastSyncedAt && payment.createdAt
            ? payment.createdAt >= lastSyncedAt
            : true,
        ),
    );
  }
}
