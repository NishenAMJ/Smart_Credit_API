import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DocumentSnapshot,
  DocumentData,
  Firestore,
  QueryDocumentSnapshot,
  Timestamp,
  WriteBatch,
} from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import {
  applyDateCursor,
  buildPageInfo,
  chunkValues,
  dedupeById,
  hasRole,
  orderByDateAndId,
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
  getPaymentAmount,
  getPaymentCreatedAt,
} from '../../../firebase/firestore-seed.utils';
import {
  LenderNotification,
  LenderNotificationsListResponse,
  LenderNotificationsSummaryResponse,
  MarkAllNotificationsReadResponse,
  NotificationActionTarget,
  NotificationCategory,
  NotificationEntityType,
  NotificationSeverity,
  NotificationStateFilter,
} from './lender-notifications.types';

type LoanRecord = {
  id: string;
  borrowerId: string | null;
  requestId: string | null;
  amount: number;
  remainingAmount: number;
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

type RequestRecord = {
  id: string;
  borrowerId: string | null;
  adId: string | null;
  targetLenderId: string | null;
  amount: number;
  status: string;
  urgency: string;
  purpose: string | null;
  matchedLenderIds: string[];
  createdAt: Date | null;
  updatedAt: Date | null;
};

type TransactionRecord = {
  id: string;
  loanId: string | null;
  type: string;
  amount: number;
  status: string;
  createdAt: Date | null;
};

type DisputeRecord = {
  id: string;
  loanId: string | null;
  type: string;
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

type AdRecord = {
  id: string;
  title: string;
  status: string;
  expiresAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

type BorrowerProfile = {
  fullName: string;
};

type LenderProfile = {
  fullName: string;
  businessName: string | null;
  email: string;
  city: string | null;
  district: string | null;
  kycStatus: string;
};

type NotificationGenerationPreferences = {
  inAppNewRequests: boolean;
  inAppTransactions: boolean;
  inAppStatusUpdates: boolean;
  inAppOverdues: boolean;
  inAppAdExpiry: boolean;
  inAppDisputes: boolean;
};

type NotificationDraft = {
  id: string;
  lenderId: string;
  category: NotificationCategory;
  eventType: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  createdAt: Date;
  relatedEntityType: NotificationEntityType;
  relatedEntityId: string | null;
  actionLabel: string | null;
  actionTarget: NotificationActionTarget;
  metadata: Record<string, string | number>;
};

const CATEGORY_ORDER: NotificationCategory[] = [
  'loan_request',
  'transaction',
  'repayment_risk',
  'dispute',
  'ad',
  'system',
];

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationGenerationPreferences = {
  inAppNewRequests: true,
  inAppTransactions: true,
  inAppStatusUpdates: true,
  inAppOverdues: true,
  inAppAdExpiry: true,
  inAppDisputes: true,
};

const REQUEST_STATUS_UPDATES = new Set(['under_review', 'approved', 'pending_kyc']);

@Injectable()
export class LenderNotificationsService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async getNotifications(
    lenderId: string,
    category: string | undefined,
    state: NotificationStateFilter,
    pageSize = 60,
    cursor?: string | null,
  ): Promise<LenderNotificationsListResponse> {
    await this.syncNotifications(lenderId);

    const notifications = await this.loadNotifications(lenderId);
    const countsByCategory = this.buildCountsByCategory(notifications);
    const unreadCount = notifications.filter((notification) => !notification.isRead).length;
    const safePageSize = this.clamp(pageSize, 10, 100);
    const snapshot = await this.buildNotificationsQuery(
      lenderId,
      category,
      state,
      safePageSize,
      cursor,
    ).get();
    const filtered = snapshot.docs.slice(0, safePageSize).map((doc) => this.mapNotification(doc));

    return {
      lenderId,
      unreadCount,
      countsByCategory,
      notifications: filtered,
      pageInfo: buildPageInfo(
        filtered.map((notification) => ({
          ...notification,
          cursorDate: new Date(notification.createdAt),
          cursorId: notification.id,
        })),
        safePageSize,
        snapshot.docs.length > safePageSize,
      ),
    };
  }

  async getSummary(
    lenderId: string,
  ): Promise<LenderNotificationsSummaryResponse> {
    await this.syncNotifications(lenderId);

    const notifications = await this.loadNotifications(lenderId);
    const countsByCategory = this.buildCountsByCategory(notifications);
    const unreadCount = notifications.filter((notification) => !notification.isRead).length;
    const highPriorityCount = notifications.filter((notification) =>
      ['warning', 'critical'].includes(notification.severity),
    ).length;
    const todaysCount = notifications.filter((notification) =>
      this.isToday(notification.createdAt),
    ).length;
    const topCategory = this.getTopCategory(countsByCategory);

    return {
      lenderId,
      unreadCount,
      totalCount: notifications.length,
      highPriorityCount,
      todaysCount,
      topCategory,
      countsByCategory,
    };
  }

  async markAsRead(
    lenderId: string,
    notificationId: string,
  ): Promise<LenderNotification> {
    const docRef = this.firebaseService
      .getDb()
      .collection('lenderNotifications')
      .doc(notificationId);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      throw new NotFoundException(`Notification ${notificationId} was not found.`);
    }

    const data = snapshot.data();

    if (!data || data.lenderId !== lenderId) {
      throw new NotFoundException(`Notification ${notificationId} was not found.`);
    }

    if (data.isRead !== true) {
      await docRef.update({
        isRead: true,
        readAt: Timestamp.now(),
      });
    }

    const updatedSnapshot = await docRef.get();
    return this.mapNotification(updatedSnapshot);
  }

  async markAllAsRead(
    lenderId: string,
    category: string | undefined,
    state: NotificationStateFilter,
  ): Promise<MarkAllNotificationsReadResponse> {
    await this.syncNotifications(lenderId);

    const collection = await this.firebaseService
      .getDb()
      .collection('lenderNotifications')
      .where('lenderId', '==', lenderId)
      .get();

    const targets = collection.docs
      .map((doc) => this.mapNotification(doc))
      .filter((notification) => this.matchesCategory(notification, category))
      .filter((notification) => this.matchesState(notification, state))
      .filter((notification) => !notification.isRead);

    if (targets.length === 0) {
      return { lenderId, updatedCount: 0 };
    }

    const timestamp = Timestamp.now();
    const batch = this.firebaseService.getDb().batch();

    targets.forEach((notification) => {
      batch.update(
        this.firebaseService
          .getDb()
          .collection('lenderNotifications')
          .doc(notification.id),
        {
          isRead: true,
          readAt: timestamp,
        },
      );
    });

    await batch.commit();

    return {
      lenderId,
      updatedCount: targets.length,
    };
  }

  async createNotification(
    draft: NotificationDraft,
  ): Promise<void> {
    const existingSnapshot = await this.firebaseService
      .getDb()
      .collection('lenderNotifications')
      .doc(draft.id)
      .get();
    const existing = existingSnapshot.data();
    const readAt = existing?.readAt instanceof Timestamp ? existing.readAt : null;
    const isRead = existing?.isRead === true;

    await this.firebaseService
      .getDb()
      .collection('lenderNotifications')
      .doc(draft.id)
      .set({
        lenderId: draft.lenderId,
        category: draft.category,
        eventType: draft.eventType,
        title: draft.title,
        message: draft.message,
        severity: draft.severity,
        isRead,
        createdAt: Timestamp.fromDate(draft.createdAt),
        readAt,
        relatedEntityType: draft.relatedEntityType,
        relatedEntityId: draft.relatedEntityId,
        actionLabel: draft.actionLabel,
        actionTarget: draft.actionTarget,
        metadata: draft.metadata,
      });
  }

  private async syncNotifications(lenderId: string): Promise<void> {
    const db = this.firebaseService.getDb();
    const [lenderProfile, preferences, syncCursor] = await Promise.all([
      this.getLenderProfile(lenderId),
      this.getNotificationPreferences(lenderId),
      this.getLastSyncedAt(lenderId),
    ]);

    const [loansSnapshot, adsSnapshot] = await Promise.all([
      db.collection('loans').where('lenderId', '==', lenderId).get(),
      db.collection('ads').where('lenderId', '==', lenderId).get(),
    ]);

    const loans = await Promise.all(
      loansSnapshot.docs.map((doc) => this.mapLoan(db, doc)),
    );
    const ads = adsSnapshot.docs.map((doc) => this.mapAd(doc));
    const adIds = new Set(ads.map((ad) => ad.id));
    const loanMap = new Map(loans.map((loan) => [loan.id, loan]));
    const loanIds = new Set(loans.map((loan) => loan.id));

    const [scopedRequests, transactions, disputes, overdueMap] =
      await Promise.all([
        this.getRequestsForLender(db, lenderId, adIds, syncCursor),
        this.getTransactionsForLender(db, lenderId, loanIds, syncCursor),
        this.getDisputesForLender(db, lenderId, loanIds, syncCursor),
        this.getOverdueLoanMap(lenderId, loans, syncCursor),
      ]);

    const borrowerMap = await this.getBorrowerMap([
      ...loans
        .map((loan) => loan.borrowerId)
        .filter((borrowerId): borrowerId is string => Boolean(borrowerId)),
      ...scopedRequests
        .map((request) => request.borrowerId)
        .filter((borrowerId): borrowerId is string => Boolean(borrowerId)),
    ]);

    const drafts = [
      ...this.buildRequestNotifications(
        lenderId,
        scopedRequests,
        borrowerMap,
        preferences,
      ),
      ...this.buildTransactionNotifications(
        lenderId,
        transactions,
        loanMap,
        borrowerMap,
        preferences,
      ),
      ...this.buildRiskNotifications(
        lenderId,
        loans,
        overdueMap,
        borrowerMap,
        preferences,
      ),
      ...this.buildDisputeNotifications(
        lenderId,
        disputes,
        loanMap,
        borrowerMap,
        preferences,
      ),
      ...this.buildAdNotifications(lenderId, ads, preferences),
      ...this.buildSystemNotifications(lenderId, lenderProfile),
    ];

    await this.persistDrafts(drafts);
    await this.firebaseService
      .getDb()
      .collection('lenderNotificationSync')
      .doc(lenderId)
      .set(
        {
          lenderId,
          lastSyncedAt: Timestamp.now(),
        },
        { merge: true },
      );
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
      db.collection('loanRequests').where('targetLenderId', '==', lenderId),
      db.collection('loanRequests').where('matchedLenderIds', 'array-contains', lenderId),
      ...chunkValues(Array.from(adIds), 10).map((adIdChunk) =>
        db.collection('loanRequests').where('adId', 'in', adIdChunk),
      ),
    ];

    const snapshots = await Promise.all(
      baseQueries.map((query) =>
        lastSyncedAt ? query.where('updatedAt', '>=', lastSyncedAt).get() : query.get(),
      ),
    );

    return dedupeById(
      snapshots.flatMap((snapshot) =>
        snapshot.docs.map((doc) => this.mapRequest(doc)),
      ),
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
        return snapshot.docs.map((doc) => this.mapTransaction(doc));
      }
    } catch {}

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

    return this.getNestedPaymentTransactions(db, Array.from(loanIds), lastSyncedAt);
  }

  private async getDisputesForLender(
    db: Firestore,
    lenderId: string,
    loanIds: Set<string>,
    lastSyncedAt: Date | null,
  ): Promise<DisputeRecord[]> {
    if (loanIds.size === 0) {
      return [];
    }

    const lenderScopedQuery = db.collection('disputes').where('lenderId', '==', lenderId);

    try {
      const snapshot = await (lastSyncedAt
        ? lenderScopedQuery.where('updatedAt', '>=', lastSyncedAt).get()
        : lenderScopedQuery.get());

      if (snapshot.size > 0) {
        return snapshot.docs.map((doc) => this.mapDispute(doc));
      }
    } catch {}

    const snapshots = await Promise.all(
      chunkValues(Array.from(loanIds), 10).map((loanIdChunk) =>
        db.collection('disputes').where('loanId', 'in', loanIdChunk).get(),
      ),
    );

    return dedupeById(
      snapshots
        .flatMap((snapshot) => snapshot.docs)
        .map((doc) => this.mapDispute(doc))
        .filter((dispute) => (dispute.loanId ? loanIds.has(dispute.loanId) : false))
        .filter((dispute) =>
          lastSyncedAt && (dispute.updatedAt ?? dispute.createdAt)
            ? (dispute.updatedAt ?? dispute.createdAt)! >= lastSyncedAt
            : true,
        ),
    );
  }

  private async persistDrafts(drafts: NotificationDraft[]): Promise<void> {
    if (drafts.length === 0) {
      return;
    }

    const db = this.firebaseService.getDb();
    const refs = drafts.map((draft) =>
      db.collection('lenderNotifications').doc(draft.id),
    );
    const existingSnapshots = await db.getAll(...refs);
    const existingMap = new Map(
      existingSnapshots.map((snapshot) => [snapshot.id, snapshot.data() ?? {}]),
    );

    const batch = db.batch();
    drafts.forEach((draft) => {
      const existing = existingMap.get(draft.id) ?? {};
      this.setNotificationDocument(batch, draft, existing);
    });

    await batch.commit();
  }

  private setNotificationDocument(
    batch: WriteBatch,
    draft: NotificationDraft,
    existing: Record<string, unknown>,
  ): void {
    const isRead = existing.isRead === true;
    const readAt =
      existing.readAt instanceof Timestamp
        ? existing.readAt
        : existing.readAt instanceof Date
          ? Timestamp.fromDate(existing.readAt)
          : null;

    batch.set(
      this.firebaseService
        .getDb()
        .collection('lenderNotifications')
        .doc(draft.id),
      {
        lenderId: draft.lenderId,
        category: draft.category,
        eventType: draft.eventType,
        title: draft.title,
        message: draft.message,
        severity: draft.severity,
        isRead,
        createdAt: Timestamp.fromDate(draft.createdAt),
        readAt,
        relatedEntityType: draft.relatedEntityType,
        relatedEntityId: draft.relatedEntityId,
        actionLabel: draft.actionLabel,
        actionTarget: draft.actionTarget,
        metadata: draft.metadata,
      },
    );
  }

  private buildRequestNotifications(
    lenderId: string,
    requests: RequestRecord[],
    borrowerMap: Map<string, BorrowerProfile>,
    preferences: NotificationGenerationPreferences,
  ): NotificationDraft[] {
    return requests.flatMap((request) => {
      const borrowerName =
        borrowerMap.get(request.borrowerId ?? '')?.fullName ?? 'Borrower';
      const drafts: NotificationDraft[] = [];
      const requestDate = request.updatedAt ?? request.createdAt ?? new Date();
      const isTargeted = Boolean(request.adId || request.targetLenderId === lenderId);

      if (
        preferences.inAppNewRequests &&
        ['open', 'matched'].includes(request.status)
      ) {
        drafts.push({
          id: `${isTargeted ? 'targeted' : 'marketplace'}-request-${request.id}`,
          lenderId,
          category: 'loan_request',
          eventType: isTargeted ? 'new_targeted_request' : 'new_marketplace_request',
          title: isTargeted ? 'New targeted loan request' : 'New marketplace match',
          message: `${borrowerName} requested ${this.formatCurrency(request.amount)} for ${request.purpose ?? 'a new loan offer'}.`,
          severity: request.urgency === 'critical' ? 'critical' : 'info',
          createdAt: request.createdAt ?? new Date(),
          relatedEntityType: 'loanRequest',
          relatedEntityId: request.id,
          actionLabel: 'Open request',
          actionTarget: 'pending-requests',
          metadata: {
            borrowerId: request.borrowerId ?? '',
            amount: request.amount,
            status: request.status,
            adId: request.adId ?? '',
          },
        });
      }

      if (
        preferences.inAppStatusUpdates &&
        REQUEST_STATUS_UPDATES.has(request.status)
      ) {
        drafts.push({
          id: `request-status-${request.status}-${request.id}`,
          lenderId,
          category: 'loan_request',
          eventType: 'request_status_update',
          title: `Request moved to ${this.formatLabel(request.status)}`,
          message: `${borrowerName}'s request is now ${this.formatLabel(request.status).toLowerCase()}.`,
          severity: request.status === 'approved' ? 'success' : 'warning',
          createdAt: requestDate,
          relatedEntityType: 'loanRequest',
          relatedEntityId: request.id,
          actionLabel: 'Review request',
          actionTarget: 'pending-requests',
          metadata: {
            borrowerId: request.borrowerId ?? '',
            amount: request.amount,
            status: request.status,
            adId: request.adId ?? '',
          },
        });
      }

      return drafts;
    });
  }

  private buildTransactionNotifications(
    lenderId: string,
    transactions: TransactionRecord[],
    loanMap: Map<string, LoanRecord>,
    borrowerMap: Map<string, BorrowerProfile>,
    preferences: NotificationGenerationPreferences,
  ): NotificationDraft[] {
    if (!preferences.inAppTransactions) {
      return [];
    }

    return transactions
      .filter((transaction) => transaction.type === 'repayment')
      .map((transaction) => {
        const loan = transaction.loanId ? loanMap.get(transaction.loanId) : undefined;
        const borrowerName =
          loan?.borrowerId ? borrowerMap.get(loan.borrowerId)?.fullName : null;

        return {
          id: `transaction-repayment-${transaction.id}`,
          lenderId,
          category: 'transaction',
          eventType:
            transaction.amount >= 100000 ? 'large_repayment_received' : 'repayment_received',
          title:
            transaction.amount >= 100000
              ? 'Large repayment received'
              : 'Repayment received',
          message: `${borrowerName ?? 'A borrower'} paid ${this.formatCurrency(transaction.amount)} toward loan ${transaction.loanId ?? 'Unknown'}.`,
          severity: 'success',
          createdAt: transaction.createdAt ?? new Date(),
          relatedEntityType: 'transaction',
          relatedEntityId: transaction.id,
          actionLabel: 'View analytics',
          actionTarget: 'analytics',
          metadata: {
            borrowerId: loan?.borrowerId ?? '',
            loanId: transaction.loanId ?? '',
            amount: transaction.amount,
            status: transaction.status,
          },
        };
      });
  }

  private buildRiskNotifications(
    lenderId: string,
    loans: LoanRecord[],
    overdueMap: Map<string, Date>,
    borrowerMap: Map<string, BorrowerProfile>,
    preferences: NotificationGenerationPreferences,
  ): NotificationDraft[] {
    if (!preferences.inAppOverdues) {
      return [];
    }

    const drafts: NotificationDraft[] = [];

    overdueMap.forEach((createdAt, loanId) => {
      const loan = loans.find((item) => item.id === loanId);
      const borrowerName =
        loan?.borrowerId ? borrowerMap.get(loan.borrowerId)?.fullName : null;

      drafts.push({
        id: `risk-overdue-${loanId}`,
        lenderId,
        category: 'repayment_risk',
        eventType: 'loan_overdue',
        title: 'Overdue payment detected',
        message: `${borrowerName ?? 'A borrower'} has an overdue installment on loan ${loanId}.`,
        severity: 'warning',
        createdAt,
        relatedEntityType: 'loan',
        relatedEntityId: loanId,
        actionLabel: 'Open dashboard',
        actionTarget: 'dashboard',
        metadata: {
          borrowerId: loan?.borrowerId ?? '',
          loanId,
          amount: loan?.remainingAmount ?? 0,
          status: loan?.status ?? 'overdue',
        },
      });
    });

    loans
      .filter((loan) => loan.status === 'defaulted')
      .forEach((loan) => {
        const borrowerName =
          loan.borrowerId ? borrowerMap.get(loan.borrowerId)?.fullName : null;

        drafts.push({
          id: `risk-defaulted-${loan.id}`,
          lenderId,
          category: 'repayment_risk',
          eventType: 'loan_defaulted',
          title: 'Loan moved to defaulted status',
          message: `${borrowerName ?? 'A borrower'} now has a defaulted loan in your portfolio.`,
          severity: 'critical',
          createdAt: loan.updatedAt ?? loan.createdAt ?? new Date(),
          relatedEntityType: 'loan',
          relatedEntityId: loan.id,
          actionLabel: 'View analytics',
          actionTarget: 'analytics',
          metadata: {
            borrowerId: loan.borrowerId ?? '',
            loanId: loan.id,
            amount: loan.remainingAmount,
            status: loan.status,
          },
        });
      });

    return drafts;
  }

  private buildDisputeNotifications(
    lenderId: string,
    disputes: DisputeRecord[],
    loanMap: Map<string, LoanRecord>,
    borrowerMap: Map<string, BorrowerProfile>,
    preferences: NotificationGenerationPreferences,
  ): NotificationDraft[] {
    if (!preferences.inAppDisputes) {
      return [];
    }

    return disputes.map((dispute) => {
      const loan = dispute.loanId ? loanMap.get(dispute.loanId) : undefined;
      const borrowerName =
        loan?.borrowerId ? borrowerMap.get(loan.borrowerId)?.fullName : null;
      const isOpen = ['open', 'under_review'].includes(dispute.status);

      return {
        id: `dispute-${dispute.id}-${dispute.status}`,
        lenderId,
        category: 'dispute',
        eventType: isOpen ? 'dispute_opened' : 'dispute_updated',
        title: isOpen ? 'Dispute needs review' : 'Dispute status updated',
        message: `${borrowerName ?? 'A borrower'} has a ${this.formatLabel(dispute.type).toLowerCase()} dispute on loan ${dispute.loanId ?? 'Unknown'}.`,
        severity: isOpen ? 'critical' : 'info',
        createdAt: dispute.updatedAt ?? dispute.createdAt ?? new Date(),
        relatedEntityType: 'dispute',
        relatedEntityId: dispute.id,
        actionLabel: 'View analytics',
        actionTarget: 'analytics',
        metadata: {
          borrowerId: loan?.borrowerId ?? '',
          loanId: dispute.loanId ?? '',
          status: dispute.status,
        },
      };
    });
  }

  private buildAdNotifications(
    lenderId: string,
    ads: AdRecord[],
    preferences: NotificationGenerationPreferences,
  ): NotificationDraft[] {
    if (!preferences.inAppAdExpiry) {
      return [];
    }

    const now = new Date();
    const soonThreshold = new Date(now);
    soonThreshold.setDate(soonThreshold.getDate() + 7);

    return ads.flatMap((ad) => {
      if (!ad.expiresAt || !['active', 'approved'].includes(ad.status)) {
        return [];
      }

      if (ad.expiresAt < now) {
        return [
          {
            id: `ad-expired-${ad.id}`,
            lenderId,
            category: 'ad',
            eventType: 'ad_expired',
            title: 'Lender ad expired',
            message: `${ad.title} is no longer active because its expiry date passed.`,
            severity: 'warning',
            createdAt: ad.expiresAt,
            relatedEntityType: 'ad',
            relatedEntityId: ad.id,
            actionLabel: 'Open ad page',
            actionTarget: 'create-ad',
            metadata: {
              adId: ad.id,
              status: ad.status,
            },
          } satisfies NotificationDraft,
        ];
      }

      if (ad.expiresAt <= soonThreshold) {
        return [
          {
            id: `ad-expiring-${ad.id}`,
            lenderId,
            category: 'ad',
            eventType: 'ad_expiring_soon',
            title: 'Lender ad expires soon',
            message: `${ad.title} will expire on ${this.formatDate(ad.expiresAt)}.`,
            severity: 'warning',
            createdAt: ad.updatedAt ?? ad.expiresAt,
            relatedEntityType: 'ad',
            relatedEntityId: ad.id,
            actionLabel: 'Manage ad',
            actionTarget: 'create-ad',
            metadata: {
              adId: ad.id,
              status: ad.status,
            },
          } satisfies NotificationDraft,
        ];
      }

      return [];
    });
  }

  private buildSystemNotifications(
    lenderId: string,
    lenderProfile: LenderProfile,
  ): NotificationDraft[] {
    const drafts: NotificationDraft[] = [
      {
        id: `system-temporary-auth-${lenderId}`,
        lenderId,
        category: 'system',
        eventType: 'temporary_auth_notice',
        title: 'Temporary sign-in is active',
        message:
          'This lender workspace still uses temporary session auth. Security controls will move into the real auth service later.',
        severity: 'info',
        createdAt: new Date('2026-04-20T00:00:00.000Z'),
        relatedEntityType: 'system',
        relatedEntityId: null,
        actionLabel: 'Open settings',
        actionTarget: 'settings',
        metadata: {},
      },
    ];

    if (lenderProfile.kycStatus !== 'approved') {
      drafts.push({
        id: `system-kyc-${lenderId}`,
        lenderId,
        category: 'system',
        eventType: 'kyc_reminder',
        title: 'KYC still needs attention',
        message: `Your current KYC status is ${this.formatLabel(lenderProfile.kycStatus).toLowerCase()}. Some workflows may stay limited until this is completed.`,
        severity: 'warning',
        createdAt: new Date('2026-04-20T00:00:00.000Z'),
        relatedEntityType: 'system',
        relatedEntityId: null,
        actionLabel: 'Review settings',
        actionTarget: 'settings',
        metadata: {
          status: lenderProfile.kycStatus,
        },
      });
    }

    if (
      !lenderProfile.businessName ||
      !lenderProfile.city ||
      !lenderProfile.district ||
      !lenderProfile.email
    ) {
      drafts.push({
        id: `system-profile-${lenderId}`,
        lenderId,
        category: 'system',
        eventType: 'profile_incomplete',
        title: 'Profile details need completion',
        message:
          'Business name, location, or contact details are still missing. Completing them improves borrower trust and future automation.',
        severity: 'info',
        createdAt: new Date('2026-04-20T00:00:00.000Z'),
        relatedEntityType: 'system',
        relatedEntityId: null,
        actionLabel: 'Open settings',
        actionTarget: 'settings',
        metadata: {},
      });
    }

    return drafts;
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

    if (!data || !hasRole(data.role, 'lender')) {
      throw new NotFoundException(`Lender ${lenderId} was not found.`);
    }

    return {
      fullName:
        typeof data.fullName === 'string' && data.fullName.trim().length > 0
          ? data.fullName
          : lenderId,
      businessName:
        typeof data.businessName === 'string' && data.businessName.trim().length > 0
          ? data.businessName
          : null,
      email: typeof data.email === 'string' ? data.email : '',
      city: typeof data.city === 'string' && data.city.trim().length > 0 ? data.city : null,
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
      ...uniqueBorrowerIds.map((borrowerId) => db.collection('users').doc(borrowerId)),
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
              const loanId = doc.get('loanId');
              if (typeof loanId !== 'string') {
                return null;
              }

              const createdAt =
                this.toDate(doc.get('updatedAt')) ??
                this.toDate(doc.get('dueDate')) ??
                this.toDate(doc.get('createdAt')) ??
                new Date();

              return [loanId, createdAt] as const;
            })
            .filter((entry): entry is readonly [string, Date] => entry !== null),
        );
      }
    } catch {}

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
      results.filter((entry): entry is readonly [string, Date] => entry !== null),
    );
  }

  private async loadNotifications(lenderId: string): Promise<LenderNotification[]> {
    const snapshot = await orderByDateAndId(
      this.firebaseService
        .getDb()
        .collection('lenderNotifications')
        .where('lenderId', '==', lenderId),
      'createdAt',
    ).get();

    return snapshot.docs
      .map((doc) => this.mapNotification(doc))
      .sort((left, right) => this.compareNotifications(left, right));
  }

  private buildNotificationsQuery(
    lenderId: string,
    category: string | undefined,
    state: NotificationStateFilter,
    pageSize: number,
    cursor?: string | null,
  ) {
    let query = orderByDateAndId(
      this.firebaseService
        .getDb()
        .collection('lenderNotifications')
        .where('lenderId', '==', lenderId),
      'createdAt',
    );

    if (category && category !== 'all') {
      query = query.where('category', '==', category);
    }

    if (state === 'read') {
      query = query.where('isRead', '==', true);
    } else if (state === 'unread') {
      query = query.where('isRead', '==', false);
    }

    return applyDateCursor(query, cursor).limit(pageSize + 1);
  }

  private compareNotifications(
    left: LenderNotification,
    right: LenderNotification,
  ): number {
    if (left.isRead !== right.isRead) {
      return left.isRead ? 1 : -1;
    }

    if (left.category !== right.category) {
      if (left.category === 'system') {
        return 1;
      }

      if (right.category === 'system') {
        return -1;
      }
    }

    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();
    return rightTime - leftTime;
  }

  private mapNotification(
    snapshot:
      | QueryDocumentSnapshot<DocumentData>
      | DocumentSnapshot<DocumentData>,
  ): LenderNotification {
    const data = snapshot.data() ?? {};

    return {
      id: snapshot.id,
      lenderId: typeof data.lenderId === 'string' ? data.lenderId : '',
      category: this.readCategory(data.category),
      eventType: typeof data.eventType === 'string' ? data.eventType : 'unknown',
      title: typeof data.title === 'string' ? data.title : 'Notification',
      message: typeof data.message === 'string' ? data.message : '',
      severity: this.readSeverity(data.severity),
      isRead: data.isRead === true,
      createdAt:
        this.toDate(data.createdAt)?.toISOString() ?? new Date().toISOString(),
      readAt: this.toDate(data.readAt)?.toISOString() ?? null,
      relatedEntityType: this.readEntityType(data.relatedEntityType),
      relatedEntityId:
        typeof data.relatedEntityId === 'string' ? data.relatedEntityId : null,
      actionLabel: typeof data.actionLabel === 'string' ? data.actionLabel : null,
      actionTarget: this.readActionTarget(data.actionTarget),
      metadata:
        data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)
          ? (data.metadata as Record<string, string | number>)
          : {},
    };
  }

  private buildCountsByCategory(
    notifications: LenderNotification[],
  ): Record<NotificationCategory, number> {
    const counts = this.createEmptyCounts();
    notifications.forEach((notification) => {
      counts[notification.category] += 1;
    });
    return counts;
  }

  private createEmptyCounts(): Record<NotificationCategory, number> {
    return {
      loan_request: 0,
      transaction: 0,
      repayment_risk: 0,
      dispute: 0,
      ad: 0,
      system: 0,
    };
  }

  private getTopCategory(
    counts: Record<NotificationCategory, number>,
  ): NotificationCategory | null {
    const sorted = CATEGORY_ORDER
      .map((category) => ({ category, count: counts[category] }))
      .sort((left, right) => right.count - left.count);

    return sorted[0]?.count ? sorted[0].category : null;
  }

  private matchesCategory(
    notification: LenderNotification,
    category: string | undefined,
  ): boolean {
    if (!category || category === 'all') {
      return true;
    }

    return notification.category === category;
  }

  private matchesState(
    notification: LenderNotification,
    state: NotificationStateFilter,
  ): boolean {
    if (state === 'all') {
      return true;
    }

    if (state === 'unread') {
      return !notification.isRead;
    }

    return notification.isRead;
  }

  private isToday(value: string): boolean {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return false;
    }

    const today = new Date();

    return (
      parsed.getFullYear() === today.getFullYear() &&
      parsed.getMonth() === today.getMonth() &&
      parsed.getDate() === today.getDate()
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
      id: typeof data.requestId === 'string' && data.requestId.trim().length > 0
        ? data.requestId
        : doc.id,
      borrowerId: typeof data.borrowerId === 'string' ? data.borrowerId : null,
      adId: typeof data.adId === 'string' ? data.adId : null,
      targetLenderId:
        typeof data.targetLenderId === 'string' ? data.targetLenderId : null,
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
      amount: this.toNumber(data.amount ?? data.paidAmount),
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

  private readCategory(value: unknown): NotificationCategory {
    return CATEGORY_ORDER.includes(value as NotificationCategory)
      ? (value as NotificationCategory)
      : 'system';
  }

  private readSeverity(value: unknown): NotificationSeverity {
    return ['info', 'success', 'warning', 'critical'].includes(value as string)
      ? (value as NotificationSeverity)
      : 'info';
  }

  private readEntityType(value: unknown): NotificationEntityType {
    return [
      'loanRequest',
      'transaction',
      'loan',
      'dispute',
      'ad',
      'system',
      null,
    ].includes(value as NotificationEntityType)
      ? (value as NotificationEntityType)
      : null;
  }

  private readActionTarget(value: unknown): NotificationActionTarget {
    return [
      'pending-requests',
      'dashboard',
      'analytics',
      'create-ad',
      'settings',
      null,
    ].includes(value as NotificationActionTarget)
      ? (value as NotificationActionTarget)
      : null;
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

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      maximumFractionDigits: 0,
    }).format(value);
  }

  private formatDate(value: Date): string {
    return new Intl.DateTimeFormat('en-LK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(value);
  }

  private formatLabel(value: string): string {
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  private async getNestedPaymentTransactions(
    db: Firestore,
    loanIds: string[],
    lastSyncedAt: Date | null,
  ): Promise<TransactionRecord[]> {
    const groups = await Promise.all(
      loanIds.map(async (loanId) => {
        const installmentsSnapshot = await db
          .collection('loans')
          .doc(loanId)
          .collection('installments')
          .get();

        const paymentGroups = await Promise.all(
          installmentsSnapshot.docs.map(async (installmentDoc) => {
            const paymentsSnapshot = await installmentDoc.ref.collection('payments').get();

            return paymentsSnapshot.docs
              .map((paymentDoc) => {
                const data = paymentDoc.data();
                return {
                  id: paymentDoc.id,
                  loanId,
                  type:
                    typeof data.type === 'string'
                      ? data.type
                      : typeof data.paymentType === 'string'
                        ? data.paymentType
                        : 'repayment',
                  amount: getPaymentAmount(data),
                  status: typeof data.status === 'string' ? data.status : 'completed',
                  createdAt: getPaymentCreatedAt(data),
                } satisfies TransactionRecord;
              })
              .filter((payment) =>
                lastSyncedAt && payment.createdAt
                  ? payment.createdAt >= lastSyncedAt
                  : true,
              );
          }),
        );

        return paymentGroups.flat();
      }),
    );

    return dedupeById(groups.flat());
  }
}
