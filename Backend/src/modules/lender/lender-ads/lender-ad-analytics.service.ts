import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentData, Query } from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import {
  readDate,
  readString,
} from '../../../firebase/firestore-query.utils';
import { getAdStatus } from '../../../firebase/firestore-seed.utils';
import { LenderAdAnalyticsResponse } from './lender-ads.types';

type AdActivityCounts = {
  applicationCount: number;
  fundedLoansCount: number;
};

@Injectable()
export class LenderAdAnalyticsService {
  private readonly applicationStatuses = [
    'submitted',
    'under_review',
    'approved',
    'rejected',
    'converted',
  ] as const;

  private readonly fundedLoanStatuses = [
    'active',
    'overdue',
    'completed',
    'defaulted',
  ] as const;

  constructor(private readonly firebaseService: FirebaseService) {}

  async getCountsForAds(
    adIds: string[],
  ): Promise<Map<string, AdActivityCounts>> {
    const entries = await Promise.all(
      adIds.map(async (adId) => {
        const [applicationCount, fundedLoansCount] = await Promise.all([
          this.countMatchingStatuses(
            'loanApplications',
            adId,
            this.applicationStatuses,
          ),
          this.countMatchingStatuses('loans', adId, this.fundedLoanStatuses),
        ]);

        return [adId, { applicationCount, fundedLoansCount }] as const;
      }),
    );

    return new Map(entries);
  }

  async getAdAnalytics(
    lenderId: string,
    adId: string,
  ): Promise<LenderAdAnalyticsResponse> {
    const normalizedAdId = adId.trim();
    if (!normalizedAdId) {
      throw new BadRequestException('Advertisement ID is required.');
    }

    const snapshot = await this.firebaseService
      .getDb()
      .collection('loanListings')
      .doc(normalizedAdId)
      .get();

    if (!snapshot.exists) {
      throw new NotFoundException(
        `Lender ad ${normalizedAdId} was not found.`,
      );
    }
    if (snapshot.get('lenderId') !== lenderId) {
      throw new ForbiddenException(
        'You can only view analytics for your own lender ads.',
      );
    }

    const [applicationCounts, loanCounts] = await Promise.all([
      this.countStatuses(
        'loanApplications',
        normalizedAdId,
        this.applicationStatuses,
      ),
      this.countStatuses(
        'loans',
        normalizedAdId,
        this.fundedLoanStatuses,
      ),
    ]);
    const applicationTotal = this.sumCounts(applicationCounts);
    const fundedTotal = this.sumCounts(loanCounts);
    const data = snapshot.data() ?? {};

    return {
      adId: normalizedAdId,
      title: readString(data.title) ?? 'Untitled ad',
      status: getAdStatus(data),
      createdAt: readDate(data.createdAt)?.toISOString() ?? null,
      expiresAt: readDate(data.expiresAt)?.toISOString() ?? null,
      applications: {
        total: applicationTotal,
        submitted: applicationCounts.submitted ?? 0,
        underReview: applicationCounts.under_review ?? 0,
        approved: applicationCounts.approved ?? 0,
        rejected: applicationCounts.rejected ?? 0,
        converted: applicationCounts.converted ?? 0,
      },
      loans: {
        funded: fundedTotal,
        active: loanCounts.active ?? 0,
        overdue: loanCounts.overdue ?? 0,
        completed: loanCounts.completed ?? 0,
        defaulted: loanCounts.defaulted ?? 0,
      },
      fundingRate:
        applicationTotal === 0
          ? 0
          : Number(((fundedTotal / applicationTotal) * 100).toFixed(1)),
    };
  }

  private async countStatuses<TStatus extends string>(
    collectionName: string,
    listingId: string,
    statuses: readonly TStatus[],
  ): Promise<Record<TStatus, number>> {
    const collection = this.firebaseService
      .getDb()
      .collection(collectionName);
    const entries = await Promise.all(
      statuses.map(async (status) => {
        const query = collection
          .where('listingId', '==', listingId)
          .where('status', '==', status) as Query<DocumentData>;
        const snapshot = await query.count().get();
        return [status, snapshot.data().count] as const;
      }),
    );

    return Object.fromEntries(entries) as Record<TStatus, number>;
  }

  private async countMatchingStatuses(
    collectionName: string,
    listingId: string,
    statuses: readonly string[],
  ): Promise<number> {
    const query = this.firebaseService
      .getDb()
      .collection(collectionName)
      .where('listingId', '==', listingId)
      .where('status', 'in', [...statuses]) as Query<DocumentData>;
    const snapshot = await query.count().get();
    return snapshot.data().count;
  }

  private sumCounts(counts: Record<string, number>): number {
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  }
}
