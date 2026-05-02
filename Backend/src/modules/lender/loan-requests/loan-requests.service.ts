import { Injectable } from '@nestjs/common';
import {
  DocumentData,
  Firestore,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import {
  applyDateCursor,
  buildPageInfo,
  orderByDateAndId,
  readDate,
  readNumber,
  readString,
  readStringArray,
  scanQueryPage,
} from '../../../firebase/firestore-query.utils';
import {
  PendingRequestListItem,
  PendingRequestsResponse,
} from './loan-requests.types';

type RawLoanRequest = {
  requestId: string;
  borrowerId: string | null;
  adId: string | null;
  targetLenderId: string | null;
  amount: number;
  tenureMonths: number;
  purpose: string;
  purposeCategory: string;
  status: string;
  suggestedInterestRate: number;
  urgency: string;
  monthlyIncome: number;
  incomeSource: string;
  requestedRegion: string;
  collateralOffered: boolean;
  matchedLenderIds: string[];
  notes: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  cursorDate: Date | null;
  cursorId: string;
};

type BorrowerProfile = {
  fullName: string;
  email: string;
  phone: string | null;
  creditScore: number | null;
  kycStatus: string;
};

const PENDING_STATUSES = new Set<string>([
  'open',
  'under_review',
  'matched',
  'approved',
  'pending_kyc',
]);

@Injectable()
export class LoanRequestsService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async getPendingRequests(
    lenderId: string,
    pageSize = 30,
    cursor?: string | null,
    includeSummary = true,
    adId?: string | null,
    includeAllStatuses = false,
  ): Promise<PendingRequestsResponse> {
    const safePageSize = Math.min(Math.max(pageSize, 8), 60);
    const db = this.firebaseService.getDb();

    const adsSnapshot = await db.collection('ads').where('lenderId', '==', lenderId).get();
    const adTitleMap = new Map<string, string>(
      adsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return [
          doc.id,
          typeof data.title === 'string' && data.title.trim().length > 0
            ? data.title
            : `Ad ${doc.id}`,
        ] as const;
      }),
    );
    const adIds = new Set<string>(adTitleMap.keys());
    const pagedRequests = await this.getRequestsPage(
      db,
      lenderId,
      adIds,
      safePageSize,
      cursor,
      adId,
      includeAllStatuses,
    );
    const prioritizedRequests = pagedRequests.items.slice(0, safePageSize);

    const borrowerIds: string[] = Array.from(
      new Set<string>(
        prioritizedRequests
          .map((request) => request.borrowerId)
          .filter((borrowerId): borrowerId is string => Boolean(borrowerId)),
      ),
    );

    const borrowerProfiles = await this.getBorrowerProfiles(borrowerIds);

    const requests: PendingRequestListItem[] = prioritizedRequests.map((request) => {
      const borrower = request.borrowerId
        ? borrowerProfiles.get(request.borrowerId)
        : undefined;

      return {
        requestId: request.requestId,
        borrowerId: request.borrowerId ?? 'unknown-borrower',
        borrowerName: borrower?.fullName ?? 'Unknown borrower',
        borrowerEmail: borrower?.email ?? 'No email',
        borrowerPhone: borrower?.phone ?? null,
        borrowerCreditScore: borrower?.creditScore ?? null,
        borrowerKycStatus: borrower?.kycStatus ?? 'not_submitted',
        amount: request.amount,
        tenureMonths: request.tenureMonths,
        purpose: request.purpose,
        purposeCategory: request.purposeCategory,
        status: request.status,
        urgency: request.urgency,
        suggestedInterestRate: request.suggestedInterestRate,
        monthlyIncome: request.monthlyIncome,
        incomeSource: request.incomeSource,
        requestedRegion: request.requestedRegion,
        collateralOffered: request.collateralOffered,
        targetType: request.adId ? 'targeted' : 'marketplace',
        adId: request.adId,
        adTitle: request.adId ? adTitleMap.get(request.adId) ?? null : null,
        createdAt: request.createdAt ? request.createdAt.toISOString() : null,
        updatedAt: request.updatedAt ? request.updatedAt.toISOString() : null,
        notes: request.notes,
        matchedLenderIds: request.matchedLenderIds,
      };
    });

    const summary = includeSummary
      ? await this.buildSummary(
          db,
          lenderId,
          adIds,
          adId,
          includeAllStatuses,
        )
      : this.buildSummaryFromRequests(prioritizedRequests);

    return {
      lenderId,
      summary,
      requests,
      pageInfo: buildPageInfo(prioritizedRequests, safePageSize, pagedRequests.items.length > safePageSize),
      generatedAt: new Date().toISOString(),
    };
  }

  private async getRequestsPage(
    db: Firestore,
    lenderId: string,
    adIds: Set<string>,
    pageSize: number,
    cursor?: string | null,
    adId?: string | null,
    includeAllStatuses = false,
  ): Promise<{ items: RawLoanRequest[] }> {
    return scanQueryPage({
      pageSize,
      cursor,
      batchSize: Math.max(pageSize * 2, 40),
      fetchChunk: async (nextCursor, batchSize) => {
        const snapshot = await applyDateCursor(
          orderByDateAndId(db.collection('loanRequests'), 'createdAt'),
          nextCursor,
        )
          .limit(batchSize)
          .get();

        return snapshot.docs;
      },
      mapDoc: async (doc) => {
        const request = this.mapLoanRequest(doc);

        if (!this.isRequestVisibleToLender(request, lenderId, adIds, adId)) {
          return null;
        }

        if (!this.isStatusIncluded(request.status, includeAllStatuses)) {
          return null;
        }

        return request;
      },
    });
  }

  private async buildSummary(
    db: Firestore,
    lenderId: string,
    adIds: Set<string>,
    adId?: string | null,
    includeAllStatuses = false,
  ) {
    const requests: RawLoanRequest[] = [];
    let cursor: string | null = null;
    let hasMore = true;

    while (hasMore) {
      const snapshot = await applyDateCursor(
        orderByDateAndId(db.collection('loanRequests'), 'createdAt'),
        cursor,
      )
        .limit(80)
        .get();

      snapshot.docs.forEach((doc) => {
        const request = this.mapLoanRequest(doc);

        if (
          this.isRequestVisibleToLender(request, lenderId, adIds, adId) &&
          this.isStatusIncluded(request.status, includeAllStatuses)
        ) {
          requests.push(request);
        }
      });

      hasMore = snapshot.docs.length === 80;
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      cursor =
        lastDoc && hasMore
          ? Buffer.from(
              JSON.stringify({
                timestamp:
                  readDate(lastDoc.get('createdAt'))?.toISOString() ??
                  new Date(0).toISOString(),
                id: lastDoc.id,
              }),
              'utf8',
            ).toString('base64url')
          : null;
    }

    return this.buildSummaryFromRequests(requests);
  }

  private buildSummaryFromRequests(requests: RawLoanRequest[]) {
    return {
      totalPendingRequests: requests.length,
      targetedRequests: requests.filter((request) => Boolean(request.adId)).length,
      marketplaceMatches: requests.filter((request) => !request.adId).length,
      highUrgencyRequests: requests.filter((request) =>
        ['high', 'critical'].includes(request.urgency),
      ).length,
    };
  }

  private isRequestVisibleToLender(
    request: RawLoanRequest,
    lenderId: string,
    adIds: Set<string>,
    adId?: string | null,
  ): boolean {
    if (adId) {
      return request.adId === adId && adIds.has(adId);
    }

    return Boolean(
      request.targetLenderId === lenderId ||
        request.matchedLenderIds.includes(lenderId) ||
        (request.adId && adIds.has(request.adId)),
    );
  }

  private isStatusIncluded(
    status: string,
    includeAllStatuses: boolean,
  ): boolean {
    return includeAllStatuses || PENDING_STATUSES.has(status);
  }

  private mapLoanRequest(
    doc: QueryDocumentSnapshot<DocumentData>,
  ): RawLoanRequest {
    const data = doc.data();

    return {
      requestId:
        typeof data.requestId === 'string' && data.requestId.trim().length > 0
          ? data.requestId
          : doc.id,
      borrowerId: typeof data.borrowerId === 'string' ? data.borrowerId : null,
      adId: typeof data.adId === 'string' ? data.adId : null,
      targetLenderId:
        typeof data.targetLenderId === 'string' ? data.targetLenderId : null,
      amount: this.toNumber(data.amount),
      tenureMonths: this.toNumber(data.tenureMonths),
      purpose: typeof data.purpose === 'string' ? data.purpose : 'Unknown purpose',
      purposeCategory:
        typeof data.purposeCategory === 'string'
          ? data.purposeCategory
          : 'uncategorized',
      status: typeof data.status === 'string' ? data.status : 'unknown',
      suggestedInterestRate: this.toNumber(data.suggestedInterestRate),
      urgency: typeof data.urgency === 'string' ? data.urgency : 'medium',
      monthlyIncome: this.toNumber(data.monthlyIncome),
      incomeSource:
        typeof data.incomeSource === 'string' ? data.incomeSource : 'unknown',
      requestedRegion:
        typeof data.requestedRegion === 'string' ? data.requestedRegion : 'Unknown',
      collateralOffered: data.collateralOffered === true,
      matchedLenderIds: readStringArray(data.matchedLenderIds),
      notes: typeof data.notes === 'string' ? data.notes : '',
      createdAt: readDate(data.createdAt),
      updatedAt: readDate(data.updatedAt, data.createdAt),
      cursorDate: readDate(data.createdAt),
      cursorId: doc.id,
    };
  }

  private async getBorrowerProfiles(
    borrowerIds: string[],
  ): Promise<Map<string, BorrowerProfile>> {
    if (borrowerIds.length === 0) {
      return new Map<string, BorrowerProfile>();
    }

    const db = this.firebaseService.getDb();
    const snapshots = await db.getAll(
      ...borrowerIds.map((borrowerId) => db.collection('users').doc(borrowerId)),
    );

    return new Map<string, BorrowerProfile>(
      snapshots.map((snapshot) => {
        const data = snapshot.data();

        return [
          snapshot.id,
          {
            fullName:
              data && typeof data.fullName === 'string' && data.fullName.trim().length > 0
                ? data.fullName
                : snapshot.id,
            email: data && typeof data.email === 'string' ? data.email : 'No email',
            phone: data && typeof data.phone === 'string' ? data.phone : null,
            creditScore:
              data &&
              typeof data.creditScore === 'number' &&
              Number.isFinite(data.creditScore)
                ? data.creditScore
                : null,
            kycStatus:
              data && typeof data.kycStatus === 'string'
                ? data.kycStatus
                : 'not_submitted',
          } satisfies BorrowerProfile,
        ] as const;
      }),
    );
  }

  private getUrgencyScore(value: string): number {
    switch (value) {
      case 'critical':
        return 4;
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
      default:
        return 0;
    }
  }

  private toNumber(value: unknown): number {
    return readNumber(value);
  }

  private toDate(value: unknown): Date | null {
    return readDate(value);
  }
}
