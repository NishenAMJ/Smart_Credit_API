import { Injectable } from '@nestjs/common';
import type { Timestamp } from 'firebase-admin/firestore';

import { FirebaseService } from '../../firebase/firebase.service';
import type { LenderDashboardSummaryResponse } from './lender.types';

@Injectable()
export class LenderService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async getDashboardSummary(
    lenderId: string,
  ): Promise<LenderDashboardSummaryResponse> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const [lenderBorrowersSnapshot, loansSnapshot, adsSnapshot, paymentsSnapshot] =
      await Promise.all([
        this.firebaseService.db
          .collection('lenderBorrowers')
          .where('lenderId', '==', lenderId)
          .get(),
        this.firebaseService.db
          .collection('loans')
          .where('lenderId', '==', lenderId)
          .get(),
        this.firebaseService.db
          .collection('ads')
          .where('lenderId', '==', lenderId)
          .get(),
        this.firebaseService.db
          .collectionGroup('payments')
          .where('lenderId', '==', lenderId)
          .get(),
      ]);

    const totalBorrowers = this.getTotalBorrowers(
      lenderBorrowersSnapshot.docs.map((doc) => doc.data()),
      loansSnapshot.docs.map((doc) => doc.data()),
    );

    const todaysCollection = paymentsSnapshot.docs.reduce((sum, doc) => {
      const data = doc.data();
      const paidAt = this.readTimestamp(data.paidAt);

      if (!paidAt || paidAt < startOfDay || paidAt > endOfDay) {
        return sum;
      }

      return sum + this.readNumber(data.amount);
    }, 0);

    const overduePayments = loansSnapshot.docs.filter((doc) => {
      const data = doc.data();
      const status = String(data.status ?? '').toLowerCase();
      const nextDueDate = this.readTimestamp(data.nextDueDate);

      return status === 'active' && !!nextDueDate && nextDueDate < startOfDay;
    }).length;

    const activeAds = adsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      const status = String(data.status ?? '').toLowerCase();
      const expiresAt = this.readTimestamp(data.expiresAt);

      if (status !== 'active' && status !== 'approved') {
        return false;
      }

      return !expiresAt || expiresAt >= startOfDay;
    }).length;

    return {
      summary: {
        totalBorrowers,
        todaysCollection: Number(todaysCollection.toFixed(2)),
        overduePayments,
        activeAds,
      },
      generatedAt: now.toISOString(),
    };
  }

  private getTotalBorrowers(
    lenderBorrowers: Array<Record<string, unknown>>,
    loans: Array<Record<string, unknown>>,
  ): number {
    const relationBorrowerIds = lenderBorrowers
      .map((entry) => this.readString(entry.borrowerId))
      .filter((borrowerId): borrowerId is string => borrowerId.length > 0);

    if (relationBorrowerIds.length > 0) {
      return new Set(relationBorrowerIds).size;
    }

    const loanBorrowerIds = loans
      .map((entry) => this.readString(entry.borrowerId))
      .filter((borrowerId): borrowerId is string => borrowerId.length > 0);

    return new Set(loanBorrowerIds).size;
  }

  private readString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private readNumber(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private readTimestamp(value: unknown): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value;
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      'toDate' in value &&
      typeof (value as Timestamp).toDate === 'function'
    ) {
      return (value as Timestamp).toDate();
    }

    return null;
  }
}
