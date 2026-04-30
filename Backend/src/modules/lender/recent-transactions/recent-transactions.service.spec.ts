import * as firestoreQueryUtils from '../../../firebase/firestore-query.utils';
import { RecentTransactionsService } from './recent-transactions.service';

function createDoc(id: string, data: Record<string, unknown>, path: string) {
  return {
    id,
    data: () => data,
    get: (field: string) => data[field],
    ref: { path },
  } as any;
}

function createContext(loanIds: string[]) {
  const loans = loanIds.map((loanId) => ({
    id: loanId,
    borrowerId: `borrower_for_${loanId}`,
    amount: 10000,
    remainingAmount: 4000,
    interestRate: 12,
    tenureMonths: 12,
    status: 'active',
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
  }));

  return {
    loans,
    loanIds: new Set(loanIds),
    loanIdsList: loanIds,
    loanMap: new Map(loans.map((loan) => [loan.id, loan])),
    borrowerMap: new Map(
      loanIds.map((loanId) => [
        `borrower_for_${loanId}`,
        {
          fullName: `Borrower ${loanId}`,
          email: `${loanId}@smartcredit.lk`,
        },
      ]),
    ),
  } as any;
}

describe('RecentTransactionsService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds paginated payment activity from nested payment paths', async () => {
    const query = {
      limit: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [
            createDoc(
              'payment_1',
              {
                amount: 8000,
                paidAt: '2026-04-21T10:00:00.000Z',
                paymentType: 'repayment',
                status: 'completed',
              },
              'loans/loan_1/installments/installment_1/payments/payment_1',
            ),
            createDoc(
              'payment_2',
              {
                amount: 7000,
                paidAt: '2026-04-20T10:00:00.000Z',
                paymentType: 'repayment',
                status: 'completed',
              },
              'loans/loan_2/installments/installment_2/payments/payment_2',
            ),
          ],
        }),
      }),
    };
    const db = {
      collectionGroup: jest.fn().mockReturnValue(query),
      collection: jest.fn(),
    };
    const firebaseService = { getDb: () => db } as any;
    const service = new RecentTransactionsService(firebaseService);

    jest.spyOn(firestoreQueryUtils, 'orderByDateAndId').mockReturnValue(query as never);
    jest.spyOn(firestoreQueryUtils, 'applyDateCursor').mockReturnValue(query as never);

    const result = await (service as any).getRecentPaymentsPage(
      createContext(['loan_1']),
      8,
      null,
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'payment_1',
      loanId: 'loan_1',
      installmentId: 'installment_1',
      source: 'payment',
      amount: 8000,
    });
  });

  it('treats seed payment methods as loan repayments for the ledger', async () => {
    const query = {
      limit: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [
            createDoc(
              'payment_qr',
              {
                amount: 8000,
                paidAt: '2026-04-21T10:00:00.000Z',
                paymentType: 'qr',
              },
              'loans/loan_1/installments/installment_1/payments/payment_qr',
            ),
          ],
        }),
      }),
    };
    const db = {
      collectionGroup: jest.fn().mockReturnValue(query),
      collection: jest.fn(),
    };
    const firebaseService = { getDb: () => db } as any;
    const service = new RecentTransactionsService(firebaseService);

    jest.spyOn(firestoreQueryUtils, 'orderByDateAndId').mockReturnValue(query as never);
    jest.spyOn(firestoreQueryUtils, 'applyDateCursor').mockReturnValue(query as never);

    const result = await (service as any).getRecentPaymentsPage(
      createContext(['loan_1']),
      8,
      null,
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'payment_qr',
      loanId: 'loan_1',
      installmentId: 'installment_1',
      amount: 8000,
      type: 'repayment',
      source: 'payment',
    });
  });

  it('supports server-side search by installment id', async () => {
    const query = {
      limit: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [
            createDoc(
              'payment_installment_match',
              {
                amount: 6200,
                paidAt: '2026-04-21T10:00:00.000Z',
                paymentType: 'repayment',
                status: 'completed',
              },
              'loans/loan_1/installments/installment_target/payments/payment_installment_match',
            ),
          ],
        }),
      }),
    };
    const db = {
      collectionGroup: jest.fn().mockReturnValue(query),
      collection: jest.fn(),
    };
    const firebaseService = { getDb: () => db } as any;
    const service = new RecentTransactionsService(firebaseService);

    jest.spyOn(firestoreQueryUtils, 'orderByDateAndId').mockReturnValue(query as never);
    jest.spyOn(firestoreQueryUtils, 'applyDateCursor').mockReturnValue(query as never);

    const result = await (service as any).getRecentPaymentsPage(
      createContext(['loan_1']),
      8,
      null,
      'installment_target',
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].installmentId).toBe('installment_target');
  });

  it('falls back to traversing loan installments when collection group lookup is unavailable', async () => {
    const paymentDoc = createDoc(
      'payment_fallback',
      {
        amount: 9500,
        paidAt: '2026-04-21T12:00:00.000Z',
        paymentType: 'repayment',
        status: 'completed',
      },
      'loans/loan_9/installments/installment_3/payments/payment_fallback',
    );
    const paymentsRef = {
      get: jest.fn().mockResolvedValue({
        docs: [paymentDoc],
      }),
    };
    const installmentRef = {
      collection: jest.fn().mockReturnValue(paymentsRef),
    };
    const installmentsRef = {
      get: jest.fn().mockResolvedValue({
        docs: [{ ref: installmentRef }],
      }),
    };
    const loanDocRef = {
      collection: jest.fn().mockReturnValue(installmentsRef),
    };
    const db = {
      collectionGroup: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnValue({
          get: jest.fn().mockRejectedValue(new Error('missing index')),
        }),
      }),
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue(loanDocRef),
      }),
    };
    const firebaseService = { getDb: () => db } as any;
    const service = new RecentTransactionsService(firebaseService);

    const result = await (service as any).getRecentPaymentsPage(
      createContext(['loan_9']),
      8,
      null,
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'payment_fallback',
      loanId: 'loan_9',
      installmentId: 'installment_3',
      amount: 9500,
      source: 'payment',
    });
  });

  it('reads traversed payments that use the seed2 paidDate field', async () => {
    const paymentDoc = createDoc(
      'payment_seed2',
      {
        amount: 5100,
        paidDate: '2026-04-21T15:30:00.000Z',
        paymentType: 'repayment',
        status: 'completed',
      },
      'loans/loan_seed/installments/installment_seed/payments/payment_seed2',
    );
    const paymentsRef = {
      get: jest.fn().mockResolvedValue({
        docs: [paymentDoc],
      }),
    };
    const installmentRef = {
      collection: jest.fn().mockReturnValue(paymentsRef),
    };
    const installmentsRef = {
      get: jest.fn().mockResolvedValue({
        docs: [{ ref: installmentRef }],
      }),
    };
    const loanDocRef = {
      collection: jest.fn().mockReturnValue(installmentsRef),
    };
    const db = {
      collectionGroup: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnValue({
          get: jest.fn().mockRejectedValue(new Error('missing index')),
        }),
      }),
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue(loanDocRef),
      }),
    };
    const firebaseService = { getDb: () => db } as any;
    const service = new RecentTransactionsService(firebaseService);

    const result = await (service as any).getRecentPaymentsPage(
      createContext(['loan_seed']),
      8,
      null,
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'payment_seed2',
      loanId: 'loan_seed',
      installmentId: 'installment_seed',
      amount: 5100,
      source: 'payment',
    });
    expect(result.items[0].createdAt?.toISOString()).toBe('2026-04-21T15:30:00.000Z');
  });

  it('reuses the cached summary instead of rescanning history on each request', async () => {
    const service = new RecentTransactionsService({ getDb: () => ({}) } as any);
    const getAllRecentPayments = jest
      .spyOn(service as any, 'getAllRecentPayments')
      .mockResolvedValue([
        {
          id: 'payment_1',
          loanId: 'loan_1',
          installmentId: 'installment_1',
          paymentId: 'payment_1',
          type: 'repayment',
          status: 'completed',
          amount: 8000,
          createdAt: new Date('2026-04-21T10:00:00.000Z'),
          source: 'payment',
          note: null,
        },
      ]);
    const getInstallmentSummaries = jest
      .spyOn(service as any, 'getInstallmentSummaries')
      .mockResolvedValue(
        new Map([
          [
            'loan_1',
            {
              totalInstallments: 3,
              paidInstallments: 1,
              overdueInstallments: 1,
              nextDueDate: '2026-05-01T00:00:00.000Z',
              latestInstallmentStatus: 'overdue',
            },
          ],
        ]),
      );

    const first = await (service as any).getSummaryForLender(
      'lender_001',
      new Set(['loan_1']),
      ['loan_1'],
      true,
    );
    const second = await (service as any).getSummaryForLender(
      'lender_001',
      new Set(['loan_1']),
      ['loan_1'],
      true,
    );

    expect(first).toEqual(second);
    expect(getAllRecentPayments).toHaveBeenCalledTimes(1);
    expect(getInstallmentSummaries).toHaveBeenCalledTimes(1);
  });

  it('counts all matching payments for a searched loan id', async () => {
    const service = new RecentTransactionsService({ getDb: () => ({}) } as any);
    jest.spyOn(service as any, 'getAllRecentPayments').mockResolvedValue([
      {
        id: 'payment_1',
        loanId: 'loan_1',
        installmentId: 'installment_1',
        paymentId: 'payment_1',
        type: 'repayment',
        status: 'completed',
        amount: 5000,
        createdAt: new Date('2026-04-21T10:00:00.000Z'),
        source: 'payment',
        note: null,
      },
      {
        id: 'payment_2',
        loanId: 'loan_1',
        installmentId: 'installment_2',
        paymentId: 'payment_2',
        type: 'repayment',
        status: 'completed',
        amount: 6000,
        createdAt: new Date('2026-04-20T10:00:00.000Z'),
        source: 'payment',
        note: null,
      },
      {
        id: 'payment_3',
        loanId: 'loan_2',
        installmentId: 'installment_3',
        paymentId: 'payment_3',
        type: 'repayment',
        status: 'completed',
        amount: 7000,
        createdAt: new Date('2026-04-19T10:00:00.000Z'),
        source: 'payment',
        note: null,
      },
    ]);

    const count = await (service as any).getSearchResultCount(
      'lender_001',
      createContext(['loan_1', 'loan_2']),
      'loan_1',
    );

    expect(count).toBe(2);
  });
});
