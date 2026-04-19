import { Injectable, Logger } from '@nestjs/common';
import {
  DocumentData,
  Firestore,
  QueryDocumentSnapshot,
  Query,
  Timestamp,
} from 'firebase-admin/firestore';
import { FirebaseService } from '../firebase/firebase.service';
import {
  BorrowerDetailsResponse,
  DashboardBorrower,
  DashboardOverviewResponse,
} from './dashboard.types';

function isDashboardBorrower(
  borrower: DashboardBorrower | null,
): borrower is DashboardBorrower {
  return borrower !== null;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly warnedFallbacks = new Set<string>();

  constructor(private readonly firebaseService: FirebaseService) {}

  async getOverview(limit = 24): Promise<DashboardOverviewResponse> {
    const db = this.firebaseService.getDb();
    const safeLimit = this.clamp(limit, 8, 50);

    const [
      totalBorrowers,
      todaysCollection,
      overduePayments,
      activeAds,
      recentBorrowers,
    ] = await Promise.all([
      this.getBorrowerCount(db),
      this.getTodaysCollection(db),
      this.getOverduePaymentsCount(db),
      this.getActiveAdsCount(db),
      this.getRecentBorrowers(db, safeLimit),
    ]);

    return {
      summary: {
        totalBorrowers,
        todaysCollection,
        overduePayments,
        activeAds,
      },
      recentBorrowers,
      generatedAt: new Date().toISOString(),
    };
  }

  async getBorrowerDetails(
    borrowerId: string,
  ): Promise<BorrowerDetailsResponse | null> {
    const snapshot = await this.firebaseService
      .getDb()
      .collection('users')
      .doc(borrowerId)
      .get();

    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data();

    if (!data || data.role !== 'borrower') {
      return null;
    }

    return {
      id: snapshot.id,
      role: typeof data.role === 'string' ? data.role : 'borrower',
      fullName:
        typeof data.fullName === 'string' && data.fullName.trim().length > 0
          ? data.fullName
          : 'Unnamed borrower',
      email: typeof data.email === 'string' ? data.email : 'No email',
      phone: typeof data.phone === 'string' ? data.phone : null,
      address: typeof data.address === 'string' ? data.address : null,
      nic: typeof data.nic === 'string' ? data.nic : null,
      kycStatus:
        typeof data.kycStatus === 'string' ? data.kycStatus : 'not_submitted',
      creditScore:
        typeof data.creditScore === 'number' && Number.isFinite(data.creditScore)
          ? data.creditScore
          : null,
      rating:
        typeof data.rating === 'number' && Number.isFinite(data.rating)
          ? data.rating
          : null,
      activeLoansCount:
        typeof data.activeLoansCount === 'number' &&
        Number.isFinite(data.activeLoansCount)
          ? data.activeLoansCount
          : 0,
      isActive: data.isActive !== false,
      createdAt: this.toIsoString(data.createdAt),
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private async getBorrowerCount(db: Firestore): Promise<number> {
    const query = db.collection('users').where('role', '==', 'borrower');

    return this.getCountWithFallback(
      'borrower count',
      query,
      async () => (await query.get()).size,
    );
  }

  private async getActiveAdsCount(db: Firestore): Promise<number> {
    const query = db.collection('lenderAds').where('status', '==', 'approved');

    return this.getCountWithFallback(
      'active ads count',
      query,
      async () => (await query.get()).size,
    );
  }

  private async getOverduePaymentsCount(db: Firestore): Promise<number> {
    const query = db
      .collectionGroup('installments')
      .where('status', '==', 'overdue');

    return this.getCountWithFallback(
      'overdue payments count',
      query,
      async () => this.countOverdueInstallmentsByLoans(db),
    );
  }

  private async getTodaysCollection(db: Firestore): Promise<number> {
    const { start, end } = this.getCurrentDayRange();
    const query = db
      .collection('transactions')
      .where('createdAt', '>=', Timestamp.fromDate(start))
      .where('createdAt', '<', Timestamp.fromDate(end));

    try {
      const snapshot = await query.get();
      return this.sumRepaymentTransactions(snapshot.docs);
    } catch (error) {
      this.logFallback(
        'todaysCollection',
        'Falling back to an unfiltered transactions scan for todays collection.',
        error,
      );

      const snapshot = await db.collection('transactions').get();
      return this.sumRepaymentTransactions(snapshot.docs, { start, end });
    }
  }

  private getCurrentDayRange(): { start: Date; end: Date } {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return { start, end };
  }

  private async getRecentBorrowers(
    db: Firestore,
    limit: number,
  ): Promise<DashboardBorrower[]> {
    const fetchSize = Math.max(limit * 5, 50);

    try {
      const snapshot = await db
        .collection('users')
        .orderBy('createdAt', 'desc')
        .limit(fetchSize)
        .get();

      return snapshot.docs
        .map((doc) => this.mapBorrower(doc))
        .filter(isDashboardBorrower)
        .slice(0, limit);
    } catch (error) {
      this.logFallback(
        'recentBorrowers',
        'Falling back to an unordered borrower query for dashboard overview.',
        error,
      );

      const snapshot = await db.collection('users').limit(fetchSize).get();

      return snapshot.docs
        .map((doc) => this.mapBorrower(doc))
        .filter(isDashboardBorrower)
        .sort((left, right) => {
          const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
          const rightTime = right.createdAt
            ? new Date(right.createdAt).getTime()
            : 0;

          return rightTime - leftTime;
        })
        .slice(0, limit);
    }
  }

  private async getCountWithFallback(
    label: string,
    query: Query<DocumentData>,
    fallback: () => Promise<number>,
  ): Promise<number> {
    try {
      const snapshot = await query.count().get();
      return snapshot.data().count;
    } catch (error) {
      this.logFallback(
        `aggregate:${label}`,
        `Falling back from aggregate query for ${label}.`,
        error,
      );
      return fallback();
    }
  }

  private logFallback(key: string, message: string, error: unknown): void {
    if (this.warnedFallbacks.has(key)) {
      return;
    }

    this.warnedFallbacks.add(key);

    const errorCode = this.getFirestoreErrorCode(error);
    const suffix = errorCode ? ` Firestore code: ${errorCode}.` : '';
    this.logger.warn(`${message}${suffix}`);
  }

  private getFirestoreErrorCode(error: unknown): string | null {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (typeof error.code === 'number' || typeof error.code === 'string')
    ) {
      return String(error.code);
    }

    return null;
  }

  private async countOverdueInstallmentsByLoans(db: Firestore): Promise<number> {
    const loansSnapshot = await db.collection('loans').get();
    const counts = await Promise.all(
      loansSnapshot.docs.map(async (loanDoc) => {
        const installmentsSnapshot = await loanDoc.ref
          .collection('installments')
          .where('status', '==', 'overdue')
          .get();

        return installmentsSnapshot.size;
      }),
    );

    return counts.reduce((total, count) => total + count, 0);
  }

  private sumRepaymentTransactions(
    docs: QueryDocumentSnapshot<DocumentData>[],
    dateRange?: { start: Date; end: Date },
  ): number {
    return docs.reduce((total, doc) => {
      const data = doc.data();
      const amount =
        typeof data.amount === 'number' && Number.isFinite(data.amount)
          ? data.amount
          : 0;

      if (data.type !== 'repayment') {
        return total;
      }

      if (!dateRange) {
        return total + amount;
      }

      const createdAt = this.toDate(data.createdAt);

      if (!createdAt) {
        return total;
      }

      return createdAt >= dateRange.start && createdAt < dateRange.end
        ? total + amount
        : total;
    }, 0);
  }

  private mapBorrower(
    doc: QueryDocumentSnapshot<DocumentData>,
  ): DashboardBorrower | null {
    const data = doc.data();

    if (data.role !== 'borrower') {
      return null;
    }

    return {
      id: doc.id,
      fullName:
        typeof data.fullName === 'string' && data.fullName.trim().length > 0
          ? data.fullName
          : 'Unnamed borrower',
      email: typeof data.email === 'string' ? data.email : 'No email',
      creditScore:
        typeof data.creditScore === 'number' && Number.isFinite(data.creditScore)
          ? data.creditScore
          : null,
      kycStatus:
        typeof data.kycStatus === 'string' ? data.kycStatus : 'not_submitted',
      activeLoansCount:
        typeof data.activeLoansCount === 'number' &&
        Number.isFinite(data.activeLoansCount)
          ? data.activeLoansCount
          : 0,
      isActive: data.isActive !== false,
      createdAt: this.toIsoString(data.createdAt),
    };
  }

  private toIsoString(value: unknown): string | null {
    const asDate = this.toDate(value);

    return asDate ? asDate.toISOString() : null;
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
