import { Injectable } from '@nestjs/common';
import {
  DocumentData,
  Firestore,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import {
  chunkValues,
  dedupeById,
  readDate,
  readNumber,
  readString,
} from '../../../firebase/firestore-query.utils';
import {
  getAdStatus,
  getLoanCreatedAt,
} from '../../../firebase/firestore-seed.utils';
import type {
  AdRecord,
  AnalyticsSummaryContext,
  DisputeRecord,
  LoanRecord,
  RequestRecord,
  TransactionRecord,
} from './analytics.models';

@Injectable()
export class AnalyticsDataService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async loadSummaryContext(lenderId: string): Promise<AnalyticsSummaryContext> {
    const db = this.firebaseService.getDb();
    const [loanSnapshot, adSnapshot] = await Promise.all([
      db.collection('loans').where('lenderId', '==', lenderId).get(),
      db.collection('loanListings').where('lenderId', '==', lenderId).get(),
    ]);

    const loans = loanSnapshot.docs.map((doc) => this.mapLoan(doc));
    const ads = adSnapshot.docs.map((doc) => this.mapAd(doc));

    const loanIds = new Set(loans.map((loan) => loan.id));
    const adIds = new Set(ads.map((ad) => ad.id));
    const borrowerIds = Array.from(
      new Set(
        loans
          .filter((loan) => loan.status === 'active' && loan.borrowerId)
          .map((loan) => loan.borrowerId as string),
      ),
    );

    const [requests, transactions, disputes, borrowerScores] =
      await Promise.all([
        this.getRequestsForLender(db, lenderId, adIds),
        this.getTransactionsForLender(db, lenderId, loanIds),
        this.getDisputesForLender(db, lenderId, loanIds),
        borrowerIds.length > 0
          ? this.getBorrowerCreditScores(db, borrowerIds)
          : Promise.resolve([]),
      ]);

    return {
      loans,
      ads,
      requests,
      transactions,
      disputes,
      borrowerScores,
    };
  }

  private mapLoan(doc: QueryDocumentSnapshot<DocumentData>): LoanRecord {
    const data = doc.data();

    return {
      id: doc.id,
      requestId:
        typeof data.applicationId === 'string' ? data.applicationId : null,
      borrowerId: typeof data.borrowerId === 'string' ? data.borrowerId : null,
      amount: this.toNumber(data.principalMinor) / 100,
      interestRate: this.toNumber(data.annualInterestRate),
      tenureMonths: this.toNumber(data.tenureMonths),
      remainingAmount: this.toNumber(data.remainingBalanceMinor) / 100,
      status: typeof data.status === 'string' ? data.status : 'unknown',
      createdAt: getLoanCreatedAt(data),
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
    };
  }

  private mapRequest(doc: QueryDocumentSnapshot<DocumentData>): RequestRecord {
    const data = doc.data();

    return {
      id: doc.id,
      borrowerId: typeof data.borrowerId === 'string' ? data.borrowerId : null,
      targetLenderId: typeof data.lenderId === 'string' ? data.lenderId : null,
      adId: typeof data.listingId === 'string' ? data.listingId : null,
      amount: this.toNumber(data.requestedPrincipalMinor) / 100,
      tenureMonths: this.toNumber(data.requestedTenureMonths),
      purpose:
        typeof data.requestedPurpose === 'string'
          ? data.requestedPurpose
          : null,
      status: typeof data.status === 'string' ? data.status : 'unknown',
      createdAt: this.toDate(data.createdAt),
    };
  }

  private mapTransaction(
    doc: QueryDocumentSnapshot<DocumentData>,
  ): TransactionRecord {
    const data = doc.data();

    return {
      loanId: typeof data.loanId === 'string' ? data.loanId : null,
      type: typeof data.type === 'string' ? data.type : 'unknown',
      amount: this.toNumber(data.amountMinor) / 100,
      createdAt: this.toDate(data.createdAt),
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
    };
  }

  async loadAnalyticsContext(lenderId: string) {
    const db = this.firebaseService.getDb();
    const [loanSnapshot, adSnapshot] = await Promise.all([
      db.collection('loans').where('lenderId', '==', lenderId).get(),
      db.collection('loanListings').where('lenderId', '==', lenderId).get(),
    ]);

    const loans = loanSnapshot.docs.map((doc) => this.mapLoan(doc));
    const ads = adSnapshot.docs.map((doc) => this.mapAd(doc));

    const loanIds = new Set(loans.map((loan) => loan.id));
    const adIds = new Set(ads.map((ad) => ad.id));
    const [scopedRequests, transactions, disputes] = await Promise.all([
      this.getRequestsForLender(db, lenderId, adIds),
      this.getTransactionsForLoanIds(db, loanIds),
      this.getDisputesForLoanIds(db, loanIds),
    ]);

    const borrowerIds = Array.from(
      new Set([
        ...loans
          .map((loan) => loan.borrowerId)
          .filter((borrowerId): borrowerId is string => Boolean(borrowerId)),
        ...scopedRequests
          .map((request) => request.borrowerId)
          .filter((borrowerId): borrowerId is string => Boolean(borrowerId)),
      ]),
    );
    const borrowerNameMap = await this.getBorrowerNameMap(db, borrowerIds);

    return {
      loans,
      ads,
      requests: scopedRequests,
      transactions,
      disputes,
      borrowerNameMap,
      loanMap: new Map(loans.map((loan) => [loan.id, loan])),
    };
  }

  private async getRequestsForLender(
    db: Firestore,
    lenderId: string,
    adIds: Set<string>,
  ): Promise<RequestRecord[]> {
    const scopedSnapshots = await Promise.all([
      db.collection('loanApplications').where('lenderId', '==', lenderId).get(),
      ...chunkValues(Array.from(adIds), 10).map((listingIds) =>
        db
          .collection('loanApplications')
          .where('listingId', 'in', listingIds)
          .get(),
      ),
    ]);

    return dedupeById(
      scopedSnapshots
        .flatMap((snapshot) => snapshot.docs)
        .map((doc) => this.mapRequest(doc)),
    );
  }

  async countOverdueLoans(
    lenderId: string,
    loans: LoanRecord[],
  ): Promise<number> {
    const overdueLoanIds = await this.findOverdueLoanIds(lenderId, loans);
    return overdueLoanIds.size;
  }

  async findOverdueLoanIds(
    lenderId: string,
    loans: LoanRecord[],
  ): Promise<Set<string>> {
    const db = this.firebaseService.getDb();

    try {
      const snapshot = await db
        .collectionGroup('installments')
        .where('lenderId', '==', lenderId)
        .where('status', '==', 'overdue')
        .get();

      return new Set(
        snapshot.docs
          .map((doc) => readString(doc.data().loanId))
          .filter((loanId): loanId is string => typeof loanId === 'string'),
      );
    } catch {
      const overdueChecks = await Promise.all(
        loans.map(async (loan) => {
          const snapshot = await db
            .collection('loans')
            .doc(loan.id)
            .collection('installments')
            .where('status', '==', 'overdue')
            .limit(1)
            .get();

          return snapshot.empty ? null : loan.id;
        }),
      );

      return new Set(
        overdueChecks.filter((loanId): loanId is string => loanId !== null),
      );
    }
  }

  private async getTransactionsForLoanIds(
    db: Firestore,
    loanIds: Set<string>,
  ): Promise<TransactionRecord[]> {
    if (loanIds.size === 0) {
      return [];
    }

    const snapshots = await Promise.all(
      chunkValues(Array.from(loanIds), 10).map((loanIdChunk) =>
        db.collection('transactions').where('loanId', 'in', loanIdChunk).get(),
      ),
    );

    const topLevelTransactions = snapshots.flatMap((snapshot) =>
      snapshot.docs.map((doc) => this.mapTransaction(doc)),
    );

    return topLevelTransactions;
  }

  private async getTransactionsForLender(
    db: Firestore,
    lenderId: string,
    loanIds: Set<string>,
  ): Promise<TransactionRecord[]> {
    if (loanIds.size === 0) {
      return [];
    }

    try {
      const snapshot = await db
        .collection('transactions')
        .where('lenderId', '==', lenderId)
        .get();

      if (snapshot.size > 0) {
        return snapshot.docs.map((doc) => this.mapTransaction(doc));
      }
    } catch {
      // Fall back to loan-scoped transaction queries below.
    }

    return this.getTransactionsForLoanIds(db, loanIds);
  }

  private async getDisputesForLoanIds(
    db: Firestore,
    loanIds: Set<string>,
  ): Promise<DisputeRecord[]> {
    if (loanIds.size === 0) {
      return [];
    }

    const snapshots = await Promise.all(
      chunkValues(Array.from(loanIds), 10).map((loanIdChunk) =>
        db.collection('disputes').where('loanId', 'in', loanIdChunk).get(),
      ),
    );

    return dedupeById(
      snapshots.flatMap((snapshot) =>
        snapshot.docs.map((doc) => this.mapDispute(doc)),
      ),
    );
  }

  private async getDisputesForLender(
    db: Firestore,
    lenderId: string,
    loanIds: Set<string>,
  ): Promise<DisputeRecord[]> {
    if (loanIds.size === 0) {
      return [];
    }

    try {
      const snapshot = await db
        .collection('disputes')
        .where('lenderId', '==', lenderId)
        .get();

      if (snapshot.size > 0) {
        return snapshot.docs.map((doc) => this.mapDispute(doc));
      }
    } catch {
      // Fall back to loan-scoped dispute queries below.
    }

    return this.getDisputesForLoanIds(db, loanIds);
  }

  private async getBorrowerCreditScores(
    db: Firestore,
    borrowerIds: string[],
  ): Promise<number[]> {
    const snapshots = await db.getAll(
      ...borrowerIds.map((borrowerId) =>
        db.collection('users').doc(borrowerId),
      ),
    );

    return snapshots
      .map((snapshot) => {
        const data = snapshot.data();
        const profile =
          data?.borrowerProfile && typeof data.borrowerProfile === 'object'
            ? (data.borrowerProfile as DocumentData)
            : null;
        return data
          ? this.toNullableNumber(profile?.creditScore ?? data.creditScore)
          : null;
      })
      .filter((score): score is number => score !== null);
  }

  private async getBorrowerNameMap(
    db: Firestore,
    borrowerIds: string[],
  ): Promise<Map<string, string>> {
    if (borrowerIds.length === 0) {
      return new Map<string, string>();
    }

    const snapshots = await db.getAll(
      ...borrowerIds.map((borrowerId) =>
        db.collection('users').doc(borrowerId),
      ),
    );

    return new Map(
      snapshots.map((snapshot) => {
        const data = snapshot.data();
        const fullName =
          data &&
          typeof data.fullName === 'string' &&
          data.fullName.trim().length > 0
            ? data.fullName
            : snapshot.id;

        return [snapshot.id, fullName];
      }),
    );
  }

  private toDate(value: unknown): Date | null {
    return readDate(value);
  }

  private toNumber(value: unknown): number {
    return readNumber(value);
  }

  private toNullableNumber(value: unknown): number | null {
    const parsed = readNumber(value, Number.NaN);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
