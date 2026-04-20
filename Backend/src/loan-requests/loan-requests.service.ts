import { Injectable } from '@nestjs/common';
import { DocumentData, QueryDocumentSnapshot, Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../firebase/firebase.service';
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
};

type BorrowerProfile = {
  fullName: string;
  email: string;
  phone: string | null;
  creditScore: number | null;
  kycStatus: string;
};

const PENDING_STATUSES = new Set([
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
    limit = 30,
  ): Promise<PendingRequestsResponse> {
    const safeLimit = Math.min(Math.max(limit, 8), 60);
    const db = this.firebaseService.getDb();

    const [adsSnapshot, requestsSnapshot] = await Promise.all([
      db.collection('lenderAds').where('lenderId', '==', lenderId).get(),
      db.collection('loanRequests').get(),
    ]);

    const adTitleMap = new Map(
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
    const adIds = new Set(adTitleMap.keys());

    const scopedRequests = requestsSnapshot.docs
      .map((doc) => this.mapLoanRequest(doc))
      .filter((request) => this.belongsToLender(request, lenderId, adIds))
      .filter((request) => PENDING_STATUSES.has(request.status))
      .sort((left, right) => {
        const leftScore = this.getUrgencyScore(left.urgency);
        const rightScore = this.getUrgencyScore(right.urgency);

        if (rightScore !== leftScore) {
          return rightScore - leftScore;
        }

        const leftTime = left.createdAt ? left.createdAt.getTime() : 0;
        const rightTime = right.createdAt ? right.createdAt.getTime() : 0;
        return rightTime - leftTime;
      })
      .slice(0, safeLimit);

    const borrowerIds = Array.from(
      new Set(
        scopedRequests
          .map((request) => request.borrowerId)
          .filter((borrowerId): borrowerId is string => Boolean(borrowerId)),
      ),
    );

    const borrowerProfiles = await this.getBorrowerProfiles(borrowerIds);

    const requests: PendingRequestListItem[] = scopedRequests.map((request) => {
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

    return {
      lenderId,
      summary: {
        totalPendingRequests: requests.length,
        targetedRequests: requests.filter((request) => request.targetType === 'targeted').length,
        marketplaceMatches: requests.filter((request) => request.targetType === 'marketplace').length,
        highUrgencyRequests: requests.filter((request) =>
          ['high', 'critical'].includes(request.urgency),
        ).length,
      },
      requests,
      generatedAt: new Date().toISOString(),
    };
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
      matchedLenderIds: Array.isArray(data.matchedLenderIds)
        ? data.matchedLenderIds.filter(
            (value): value is string => typeof value === 'string',
          )
        : [],
      notes: typeof data.notes === 'string' ? data.notes : '',
      createdAt: this.toDate(data.createdAt),
      updatedAt: this.toDate(data.updatedAt),
    };
  }

  private belongsToLender(
    request: RawLoanRequest,
    lenderId: string,
    adIds: Set<string>,
  ): boolean {
    if (request.targetLenderId === lenderId) {
      return true;
    }

    if (request.adId && adIds.has(request.adId)) {
      return true;
    }

    return request.matchedLenderIds.includes(lenderId);
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

    return new Map(
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
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }

  private toDate(value: unknown): Date | null {
    if (value instanceof Timestamp) {
      return value.toDate();
    }

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  }
}
