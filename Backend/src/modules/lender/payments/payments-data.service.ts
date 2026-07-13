import { Injectable } from '@nestjs/common';
import { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import {
  chunkValues,
  readDate,
  readNumber,
} from '../../../firebase/firestore-query.utils';
import {
  getLoanCreatedAt,
  getNormalizedInstallment,
} from '../../../firebase/firestore-seed.utils';
import type {
  BorrowerProfile,
  InstallmentRecord,
  LenderLedgerContext,
  LoanRecord,
  TransactionRecord,
} from './payments.models';

@Injectable()
export class PaymentsDataService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async loadLenderContext(lenderId: string): Promise<LenderLedgerContext> {
    const db = this.firebaseService.getDb();
    const snapshot = await db
      .collection('loans')
      .where('lenderId', '==', lenderId)
      .get();
    const loans = snapshot.docs.map((doc) => this.mapLoan(doc));
    const loanIdsList = loans.map((loan) => loan.id);
    const borrowerIds = Array.from(
      new Set(
        loans
          .map((loan) => loan.borrowerId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    return {
      lenderId,
      loans,
      loanIds: new Set(loanIdsList),
      loanIdsList,
      loanMap: new Map(loans.map((loan) => [loan.id, loan])),
      borrowerMap: await this.getBorrowerMap(borrowerIds),
    };
  }

  async getTransactions(loanIds: Set<string>): Promise<TransactionRecord[]> {
    if (loanIds.size === 0) return [];

    const db = this.firebaseService.getDb();
    const snapshots = await Promise.all(
      chunkValues(Array.from(loanIds), 10).map((ids) =>
        db.collection('transactions').where('loanId', 'in', ids).get(),
      ),
    );

    return snapshots
      .flatMap((snapshot) => snapshot.docs)
      .map((doc) => this.mapTransaction(doc))
      .filter((transaction) =>
        transaction.loanId ? loanIds.has(transaction.loanId) : false,
      )
      .sort((left, right) => {
        const leftTime = left.createdAt?.getTime() ?? 0;
        const rightTime = right.createdAt?.getTime() ?? 0;
        return rightTime - leftTime;
      });
  }

  async getInstallmentSummaries(loanIds: string[]) {
    const db = this.firebaseService.getDb();
    const results = await Promise.all(
      loanIds.map(async (loanId) => {
        const snapshot = await db
          .collection('loans')
          .doc(loanId)
          .collection('installments')
          .get();
        const installments = snapshot.docs.map((doc) =>
          this.mapInstallment(doc),
        );
        const nextDue = installments
          .filter(
            (item) =>
              item.dueDate && !['paid', 'completed'].includes(item.status),
          )
          .sort(
            (left, right) =>
              (left.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER) -
              (right.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER),
          )[0];
        const latest = installments
          .slice()
          .sort(
            (left, right) =>
              (right.dueDate?.getTime() ?? 0) - (left.dueDate?.getTime() ?? 0),
          )[0];

        return [
          loanId,
          {
            totalInstallments: installments.length,
            paidInstallments: installments.filter((item) =>
              ['paid', 'completed'].includes(item.status),
            ).length,
            overdueInstallments: installments.filter(
              (item) => item.status === 'overdue',
            ).length,
            nextDueDate: nextDue?.dueDate?.toISOString() ?? null,
            latestInstallmentStatus: latest?.status ?? 'unknown',
          },
        ] as const;
      }),
    );

    return new Map(results);
  }

  private async getBorrowerMap(
    borrowerIds: string[],
  ): Promise<Map<string, BorrowerProfile>> {
    if (borrowerIds.length === 0) return new Map();

    const db = this.firebaseService.getDb();
    const snapshots = await db.getAll(
      ...borrowerIds.map((id) => db.collection('users').doc(id)),
    );

    return new Map(
      snapshots.map((snapshot) => {
        const data = snapshot.data();
        return [
          snapshot.id,
          {
            fullName:
              data?.fullName && typeof data.fullName === 'string'
                ? data.fullName
                : snapshot.id,
            email:
              data?.email && typeof data.email === 'string'
                ? data.email
                : 'No email',
          },
        ];
      }),
    );
  }

  private mapLoan(doc: QueryDocumentSnapshot<DocumentData>): LoanRecord {
    const data = doc.data();
    return {
      id: doc.id,
      borrowerId: typeof data.borrowerId === 'string' ? data.borrowerId : null,
      amount: readNumber(data.principalMinor) / 100,
      remainingAmount: readNumber(data.remainingBalanceMinor) / 100,
      interestRate: readNumber(data.annualInterestRate),
      tenureMonths: readNumber(data.tenureMonths),
      status: typeof data.status === 'string' ? data.status : 'unknown',
      createdAt: getLoanCreatedAt(data),
    };
  }

  private mapTransaction(
    doc: QueryDocumentSnapshot<DocumentData>,
  ): TransactionRecord {
    const data = doc.data();
    return {
      id: doc.id,
      loanId: typeof data.loanId === 'string' ? data.loanId : null,
      installmentId:
        typeof data.installmentId === 'string' ? data.installmentId : null,
      paymentId: typeof data.paymentId === 'string' ? data.paymentId : null,
      type: typeof data.type === 'string' ? data.type : 'unknown',
      status: typeof data.status === 'string' ? data.status : 'recorded',
      amount: readNumber(data.amountMinor) / 100,
      createdAt: readDate(data.createdAt),
      source: 'transaction',
      note: typeof data.note === 'string' ? data.note : null,
    };
  }

  private mapInstallment(
    doc: QueryDocumentSnapshot<DocumentData>,
  ): InstallmentRecord {
    const data = doc.data();
    const normalized = getNormalizedInstallment(data);
    const amount = readNumber(data.amountDueMinor) / 100;
    return {
      id: doc.id,
      status: normalized.status,
      dueDate: normalized.dueDate,
      amount,
      paidAmount: normalized.status === 'paid' ? amount : 0,
    };
  }
}
