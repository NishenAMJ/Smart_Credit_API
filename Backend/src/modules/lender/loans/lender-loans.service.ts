import { Injectable } from '@nestjs/common';
import { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore';
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
    const snapshot = await db
      .collection('loans')
      .where('lenderId', '==', lenderId)
      .get();
    const borrowerIds = Array.from(
      new Set(
        snapshot.docs
          .map((doc) => readString(doc.data().borrowerId))
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const borrowerSnapshots =
      borrowerIds.length > 0
        ? await db.getAll(
            ...borrowerIds.map((id) => db.collection('users').doc(id)),
          )
        : [];
    const borrowers = new Map(
      borrowerSnapshots.map((doc) => [doc.id, doc.data()]),
    );
    const allLoans = await Promise.all(
      snapshot.docs.map((doc) =>
        this.mapLoan(
          doc,
          borrowers.get(readString(doc.data().borrowerId) ?? ''),
        ),
      ),
    );
    const normalizedStatus = status?.trim().toLowerCase() || null;
    const normalizedSearch = search?.trim().toLowerCase() || null;
    const filteredLoans = allLoans
      .filter((loan) =>
        normalizedStatus
          ? loan.status.toLowerCase() === normalizedStatus
          : true,
      )
      .filter((loan) => {
        if (!normalizedSearch) return true;
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
      summary: this.buildSummary(allLoans),
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
      generatedAt: new Date().toISOString(),
    };
  }

  private async mapLoan(
    doc: QueryDocumentSnapshot<DocumentData>,
    borrower: DocumentData | undefined,
  ): Promise<LoanWithCursor> {
    const data = doc.data();
    const borrowerId = readString(data.borrowerId) ?? 'unknown-borrower';
    const installments = await doc.ref.collection('installments').get();
    const normalizedInstallments = installments.docs.map((item) => ({
      status: readString(item.data().status)?.toLowerCase() ?? 'scheduled',
      dueAt: readDate(item.data().dueAt),
    }));
    const nextDue = normalizedInstallments
      .filter((item) => !['paid', 'waived'].includes(item.status) && item.dueAt)
      .sort(
        (left, right) =>
          (left.dueAt?.getTime() ?? 0) - (right.dueAt?.getTime() ?? 0),
      )[0]?.dueAt;
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
      installmentProgress: {
        total: normalizedInstallments.length,
        paid: normalizedInstallments.filter((item) => item.status === 'paid')
          .length,
        overdue: normalizedInstallments.filter(
          (item) => item.status === 'overdue',
        ).length,
        nextDueAt: nextDue?.toISOString() ?? null,
      },
      cursorDate: createdAt,
      cursorId: doc.id,
    };
  }

  private buildSummary(
    loans: LoanWithCursor[],
  ): LenderLoansResponse['summary'] {
    return {
      totalLoans: loans.length,
      activeLoans: loans.filter((loan) => loan.status === 'active').length,
      overdueLoans: loans.filter((loan) => loan.status === 'overdue').length,
      completedLoans: loans.filter((loan) => loan.status === 'completed')
        .length,
      totalPrincipal: loans.reduce((sum, loan) => sum + loan.principal, 0),
      outstandingBalance: loans.reduce(
        (sum, loan) => sum + loan.remainingBalance,
        0,
      ),
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
