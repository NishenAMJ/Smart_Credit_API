import { Injectable, Logger } from '@nestjs/common';
import { DocumentData, Firestore, Query } from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import {
  chunkValues,
  readDate,
  readNumber,
  readString,
} from '../../../firebase/firestore-query.utils';
import {
  getNormalizedInstallment,
  isActiveAd,
} from '../../../firebase/firestore-seed.utils';
import { DashboardSummaryResponse } from './dashboard.types';

type SummaryLoan = {
  id: string;
  borrowerId: string | null;
};

@Injectable()
export class DashboardSummaryService {
  private readonly logger = new Logger(DashboardSummaryService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  async getSummary(lenderId: string): Promise<DashboardSummaryResponse> {
    const db = this.firebaseService.getDb();
    const snapshot = await db
      .collection('loans')
      .where('lenderId', '==', lenderId)
      .get();
    const lenderSnapshot = await db.collection('users').doc(lenderId).get();
    const lenderData = lenderSnapshot.data();
    const lenderName =
      readString(lenderData?.businessName, lenderData?.fullName, lenderData?.name) ??
      'Unnamed Lender';
    const loans = snapshot.docs.map((doc) => ({
      id: doc.id,
      borrowerId: readString(doc.data().borrowerId),
    }));
    const [totalBorrowers, todaysCollection, overduePayments, activeAds] =
      await Promise.all([
        this.getTotalBorrowers(db, lenderId),
        this.getTodaysCollection(db, lenderId),
        this.getOverduePayments(db, lenderId, loans),
        this.getActiveAds(db, lenderId),
      ]);

    return {
      summary: {
        lenderName,
        totalBorrowers,
        todaysCollection,
        overduePayments,
        activeAds,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  private async getActiveAds(db: Firestore, lenderId: string) {
    const now = new Date();
    const query = db
      .collection('loanListings')
      .where('lenderId', '==', lenderId)
      .where('status', 'in', ['active', 'approved'])
      .where('expiresAt', '>=', now);

    return this.getCountWithFallback(query, async () => {
      const snapshot = await db
        .collection('loanListings')
        .where('lenderId', '==', lenderId)
        .get();
      return snapshot.docs.filter((doc) => isActiveAd(doc.data(), now)).length;
    });
  }

  private async getTotalBorrowers(db: Firestore, lenderId: string) {
    const snapshot = await db
      .collection('loans')
      .where('lenderId', '==', lenderId)
      .get();
    return new Set(
      snapshot.docs
        .map((doc) => readString(doc.data().borrowerId))
        .filter(Boolean),
    ).size;
  }

  private async getOverduePayments(
    db: Firestore,
    lenderId: string,
    loans: SummaryLoan[],
  ) {
    try {
      const snapshot = await db
        .collectionGroup('installments')
        .where('lenderId', '==', lenderId)
        .where('status', '==', 'overdue')
        .count()
        .get();
      return snapshot.data().count;
    } catch (error) {
      this.logFallback('overdue installments', error);
      const counts = await Promise.all(
        loans.map(async (loan) => {
          const snapshot = await db
            .collection('loans')
            .doc(loan.id)
            .collection('installments')
            .get();
          return snapshot.docs.filter(
            (doc) => getNormalizedInstallment(doc.data()).status === 'overdue',
          ).length;
        }),
      );
      return counts.reduce((total, count) => total + count, 0);
    }
  }

  private async getTodaysCollection(db: Firestore, lenderId: string) {
    const range = this.getCurrentDayRange();
    try {
      const snapshot = await db
        .collection('transactions')
        .where('lenderId', '==', lenderId)
        .where('type', '==', 'repayment')
        .where('createdAt', '>=', range.start)
        .where('createdAt', '<', range.end)
        .get();
      return snapshot.docs.reduce(
        (total, doc) => total + readNumber(doc.data().amountMinor) / 100,
        0,
      );
    } catch (error) {
      this.logFallback("today's payments", error);
      const snapshot = await db
        .collection('loans')
        .where('lenderId', '==', lenderId)
        .get();
      return this.sumTransactions(
        db,
        snapshot.docs.map((doc) => doc.id),
        range,
      );
    }
  }

  private getCurrentDayRange() {
    const sriLankaOffsetMs = 5.5 * 60 * 60 * 1000;
    const sriLankaDate = new Date(Date.now() + sriLankaOffsetMs)
      .toISOString()
      .slice(0, 10);
    const start = new Date(`${sriLankaDate}T00:00:00+05:30`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }

  private async getCountWithFallback(
    query: Query<DocumentData>,
    fallback: () => Promise<number>,
  ) {
    try {
      return (await query.count().get()).data().count;
    } catch (error) {
      this.logFallback('aggregate count', error);
      return fallback();
    }
  }

  private async sumTransactions(
    db: Firestore,
    loanIds: string[],
    range: { start: Date; end: Date },
  ) {
    const snapshots = await Promise.all(
      chunkValues(loanIds, 10).map((ids) =>
        db
          .collection('transactions')
          .where('loanId', 'in', ids)
          .where('type', '==', 'repayment')
          .get(),
      ),
    );
    return snapshots
      .flatMap((snapshot) => snapshot.docs)
      .reduce((total, doc) => {
        const data = doc.data();
        const createdAt = readDate(data.createdAt);
        return createdAt && createdAt >= range.start && createdAt < range.end
          ? total + readNumber(data.amountMinor) / 100
          : total;
      }, 0);
  }

  private logFallback(label: string, error: unknown) {
    this.logger.warn(
      `Using dashboard fallback for ${label}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
