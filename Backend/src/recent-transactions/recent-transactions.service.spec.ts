import * as firestoreQueryUtils from '../firebase/firestore-query.utils';
import { RecentTransactionsService } from './recent-transactions.service';

function createDoc(id: string, data: Record<string, unknown>, path: string) {
  return {
    id,
    data: () => data,
    get: (field: string) => data[field],
    ref: { path },
  } as any;
}

describe('RecentTransactionsService', () => {
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

    const result = await (service as any).getRecentPaymentsPage(new Set(['loan_1']), 8, null);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'payment_1',
      loanId: 'loan_1',
      installmentId: 'installment_1',
      source: 'payment',
      amount: 8000,
    });
  });
});
