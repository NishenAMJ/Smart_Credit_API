import { Injectable } from '@nestjs/common';
import {
  AggregateField,
  DocumentData,
  FieldPath,
  Query,
  QueryDocumentSnapshot,
  Timestamp,
} from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import {
  decodeCursor,
  encodeCursor,
  readDate,
  readNumber,
  readString,
} from '../../../firebase/firestore-query.utils';
import { LenderLoanItem, LenderLoansResponse } from './lender-loans.types';

type LoanWithCursor = LenderLoanItem & {
  cursorDate: Date | null;
  cursorId: string;
};

@Injectable()
export class LenderLoansService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async getLoans(
    lenderId: string,
    pageSize = 15,
    cursor?: string | null,
    status?: string | null,
    search?: string | null,
  ): Promise<LenderLoansResponse> {
    const db = this.firebaseService.getDb();
    const safePageSize = Math.min(Math.max(pageSize, 5), 50);
    const normalizedStatus = status?.trim().toLowerCase() || null;
    const normalizedSearch = search?.trim().toLowerCase() || null;
    const summaryPromise = this.buildSummary(lenderId);

    if (normalizedSearch) {
      const result = await this.getSearchPage(
        lenderId,
        safePageSize,
        cursor,
        normalizedStatus,
        normalizedSearch,
      );
      return {
        summary: await summaryPromise,
        ...result,
        generatedAt: new Date().toISOString(),
      };
    }

    let query: Query<DocumentData> = db
      .collection('loans')
      .where('lenderId', '==', lenderId);
    if (normalizedStatus) {
      query = query.where('status', '==', normalizedStatus);
    }
    query = query
      .orderBy('createdAt', 'desc')
      .orderBy(FieldPath.documentId(), 'desc');

    const decodedCursor = decodeCursor(cursor);
    if (decodedCursor) {
      query = query.startAfter(
        Timestamp.fromDate(decodedCursor.date),
        decodedCursor.id,
      );
    }

    const snapshot = await query.limit(safePageSize + 1).get();
    const visibleDocs = snapshot.docs.slice(0, safePageSize);
    const borrowers = await this.loadBorrowers(visibleDocs);
    const loans = visibleDocs.map((doc) =>
      this.mapLoan(
        doc,
        borrowers.get(readString(doc.data().borrowerId) ?? ''),
      ),
    );
    const nextItem = loans[loans.length - 1];

    return {
      summary: await summaryPromise,
      loans: loans.map(
        ({ cursorDate: _cursorDate, cursorId: _cursorId, ...loan }) => loan,
      ),
      pageInfo: {
        pageSize: safePageSize,
        hasMore: snapshot.docs.length > safePageSize,
        nextCursor:
          snapshot.docs.length > safePageSize && nextItem?.cursorDate
            ? encodeCursor(nextItem.cursorDate, nextItem.cursorId)
            : null,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  private async getSearchPage(
    lenderId: string,
    safePageSize: number,
    cursor: string | null | undefined,
    normalizedStatus: string | null,
    normalizedSearch: string,
  ): Promise<Pick<LenderLoansResponse, 'loans' | 'pageInfo'>> {
    const db = this.firebaseService.getDb();
    const snapshot = await db
      .collection('loans')
      .where('lenderId', '==', lenderId)
      .get();
    const borrowers = await this.loadBorrowers(snapshot.docs);
    const allLoans = snapshot.docs.map((doc) =>
      this.mapLoan(
        doc,
        borrowers.get(readString(doc.data().borrowerId) ?? ''),
      ),
    );
    const filteredLoans = allLoans
      .filter((loan) =>
        normalizedStatus
          ? loan.status.toLowerCase() === normalizedStatus
          : true,
      )
      .filter((loan) => {
        return [
          loan.id,
          loan.applicationId,
          loan.listingId,
          loan.borrower.id,
          loan.borrower.fullName,
          loan.borrower.email,
          loan.status,
        ].some((value) => value?.toLowerCase().includes(normalizedSearch));
      })
      .sort((left, right) => {
        const dateDifference =
          (right.cursorDate?.getTime() ?? 0) -
          (left.cursorDate?.getTime() ?? 0);
        return dateDifference || right.cursorId.localeCompare(left.cursorId);
      });
    const decodedCursor = decodeCursor(cursor);
    const startIndex = decodedCursor
      ? filteredLoans.findIndex((loan) =>
          this.isAfterCursor(loan, decodedCursor.date, decodedCursor.id),
        )
      : 0;
    const safeStartIndex = startIndex < 0 ? filteredLoans.length : startIndex;
    const page = filteredLoans.slice(
      safeStartIndex,
      safeStartIndex + safePageSize + 1,
    );
    const visible = page.slice(0, safePageSize);
    const nextItem = visible[visible.length - 1];

    return {
      loans: visible.map(
        ({ cursorDate: _cursorDate, cursorId: _cursorId, ...loan }) => loan,
      ),
      pageInfo: {
        pageSize: safePageSize,
        hasMore: page.length > safePageSize,
        nextCursor:
          page.length > safePageSize && nextItem?.cursorDate
            ? encodeCursor(nextItem.cursorDate, nextItem.cursorId)
            : null,
      },
    };
  }

  private async loadBorrowers(
    loanDocs: QueryDocumentSnapshot<DocumentData>[],
  ): Promise<Map<string, DocumentData | undefined>> {
    const db = this.firebaseService.getDb();
    const borrowerIds = Array.from(
      new Set(
        loanDocs
          .map((doc) => readString(doc.data().borrowerId))
          .filter((id): id is string => Boolean(id)),
      ),
    );
    if (!borrowerIds.length) return new Map();

    const snapshots = await db.getAll(
      ...borrowerIds.map((id) => db.collection('users').doc(id)),
    );
    return new Map(snapshots.map((doc) => [doc.id, doc.data()]));
  }

  private mapLoan(
    doc: QueryDocumentSnapshot<DocumentData>,
    borrower: DocumentData | undefined,
  ): LoanWithCursor {
    const data = doc.data();
    const borrowerId = readString(data.borrowerId) ?? 'unknown-borrower';
    const createdAt = readDate(data.createdAt, data.approvedAt);

    return {
      id: doc.id,
      applicationId: readString(data.applicationId),
      listingId: readString(data.listingId),
      borrower: {
        id: borrowerId,
        fullName: readString(borrower?.fullName) ?? 'Unknown borrower',
        email: readString(borrower?.email) ?? 'No email',
      },
      currency: readString(data.currency) ?? 'LKR',
      principal: this.minorToMajor(data.principalMinor, data.principalAmount),
      totalRepayable: this.minorToMajor(
        data.totalRepayableMinor,
        data.totalRepayable,
      ),
      monthlyInstallment: this.minorToMajor(
        data.monthlyInstallmentMinor,
        data.monthlyInstallment,
      ),
      amountPaid: this.minorToMajor(data.amountPaidMinor, data.amountPaid),
      remainingBalance: this.minorToMajor(
        data.remainingBalanceMinor,
        data.remainingAmount,
      ),
      annualInterestRate: readNumber(
        data.annualInterestRate,
        data.interestRate,
      ),
      tenureMonths: readNumber(data.tenureMonths),
      status: readString(data.status) ?? 'unknown',
      disbursedAt: this.toIsoString(data.disbursedAt),
      maturityDate: this.toIsoString(data.maturityDate),
      createdAt: createdAt?.toISOString() ?? null,
      cursorDate: createdAt,
      cursorId: doc.id,
    };
  }

  private async buildSummary(
    lenderId: string,
  ): Promise<LenderLoansResponse['summary']> {
    const loans = this.firebaseService
      .getDb()
      .collection('loans')
      .where('lenderId', '==', lenderId);
    const [portfolio, active, overdue, completed] = await Promise.all([
      loans
        .aggregate({
          totalLoans: AggregateField.count(),
          totalPrincipalMinor: AggregateField.sum('principalMinor'),
          outstandingBalanceMinor: AggregateField.sum(
            'remainingBalanceMinor',
          ),
        })
        .get(),
      loans.where('status', '==', 'active').count().get(),
      loans.where('status', '==', 'overdue').count().get(),
      loans.where('status', '==', 'completed').count().get(),
    ]);
    const totals = portfolio.data();

    return {
      totalLoans: totals.totalLoans,
      activeLoans: active.data().count,
      overdueLoans: overdue.data().count,
      completedLoans: completed.data().count,
      totalPrincipal: Number(totals.totalPrincipalMinor ?? 0) / 100,
      outstandingBalance: Number(totals.outstandingBalanceMinor ?? 0) / 100,
    };
  }

  private minorToMajor(minorValue: unknown, legacyValue: unknown): number {
    return typeof minorValue === 'number'
      ? minorValue / 100
      : readNumber(legacyValue);
  }

  private toIsoString(value: unknown): string | null {
    return readDate(value)?.toISOString() ?? null;
  }

  private isAfterCursor(
    loan: LoanWithCursor,
    cursorDate: Date,
    cursorId: string,
  ): boolean {
    const loanTime = loan.cursorDate?.getTime() ?? 0;
    const cursorTime = cursorDate.getTime();
    return (
      loanTime < cursorTime ||
      (loanTime === cursorTime && loan.cursorId.localeCompare(cursorId) < 0)
    );
  }
}
