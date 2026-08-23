import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import {
  readDate,
  readNumber,
  readString,
} from '../../../firebase/firestore-query.utils';
import {
  getLoanCreatedAt,
  getNormalizedInstallment,
  getPaymentAmount,
} from '../../../firebase/firestore-seed.utils';
import { LoanLedgerDetailsResponse } from './payments.types';

@Injectable()
export class PaymentLedgerDetailsService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async get(
    lenderId: string,
    loanId: string,
  ): Promise<LoanLedgerDetailsResponse | null> {
    const db = this.firebaseService.getDb();
    const loanSnapshot = await db.collection('loans').doc(loanId).get();

    if (!loanSnapshot.exists || loanSnapshot.get('lenderId') !== lenderId) {
      return null;
    }

    const loan = loanSnapshot.data() ?? {};
    const [installmentsSnapshot, transactionsSnapshot] = await Promise.all([
      loanSnapshot.ref.collection('installments').get(),
      db.collection('transactions').where('loanId', '==', loanId).get(),
    ]);
    const paymentsByInstallment = new Map<
      string,
      LoanLedgerDetailsResponse['installments'][number]['payments']
    >();

    transactionsSnapshot.docs.forEach((transactionDoc) => {
      const data = transactionDoc.data();
      const installmentId = readString(data.installmentId);
      const type = readString(data.type) ?? 'repayment';

      if (!installmentId || type !== 'repayment') return;

      const createdAt = readDate(data.completedAt, data.createdAt);
      const payments = paymentsByInstallment.get(installmentId) ?? [];
      payments.push({
        id: transactionDoc.id,
        amount: getPaymentAmount(data),
        status: readString(data.status) ?? 'unknown',
        type,
        createdAt: createdAt?.toISOString() ?? null,
        source: 'transaction',
        note: this.normalizeNote(data.note),
      });
      paymentsByInstallment.set(installmentId, payments);
    });

    const installments = installmentsSnapshot.docs
      .map((installmentDoc) => {
        const data = installmentDoc.data();
        const normalized = getNormalizedInstallment(data);
        const amount = readNumber(data.amountDueMinor) / 100;
        const paidAt = readDate(data.lastPaymentAt ?? data.paidAt);

        return {
          id: installmentDoc.id,
          status: normalized.status,
          dueDate: normalized.dueDate?.toISOString() ?? null,
          amount,
          paidAmount: normalized.status === 'paid' ? amount : 0,
          lastPaymentAt: paidAt?.toISOString() ?? null,
          note: this.normalizeNote(data.note),
          payments: (paymentsByInstallment.get(installmentDoc.id) ?? []).sort(
            (left, right) =>
              new Date(right.createdAt ?? 0).getTime() -
              new Date(left.createdAt ?? 0).getTime(),
          ),
        };
      })
      .sort((left, right) => {
        const leftTime = left.dueDate ? new Date(left.dueDate).getTime() : 0;
        const rightTime = right.dueDate ? new Date(right.dueDate).getTime() : 0;
        return leftTime - rightTime;
      });
    const createdAt = getLoanCreatedAt(loan);

    return {
      lenderId,
      loan: {
        id: loanSnapshot.id,
        borrowerId: readString(loan.borrowerId),
        status: readString(loan.status) ?? 'unknown',
        amount: readNumber(loan.principalMinor) / 100,
        remainingAmount: readNumber(loan.remainingBalanceMinor) / 100,
        interestRate: readNumber(loan.annualInterestRate),
        tenureMonths: readNumber(loan.tenureMonths),
        createdAt: createdAt?.toISOString() ?? null,
      },
      installments,
    };
  }

  private normalizeNote(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
}
