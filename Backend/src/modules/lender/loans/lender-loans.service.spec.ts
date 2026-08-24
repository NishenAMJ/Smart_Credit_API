import { Timestamp } from 'firebase-admin/firestore';
import { LenderLoansService } from './lender-loans.service';

describe('LenderLoansService', () => {
  it('paginates loan documents without reading installment subcollections', async () => {
    const createdAt = Timestamp.fromDate(new Date('2026-01-01T00:00:00Z'));
    const loanData = {
      lenderId: 'lender_001',
      borrowerId: 'borrower_001',
      applicationId: 'application_001',
      listingId: 'listing_001',
      currency: 'LKR',
      principalMinor: 12000000,
      totalRepayableMinor: 12720000,
      monthlyInstallmentMinor: 2120000,
      amountPaidMinor: 4240000,
      remainingBalanceMinor: 8480000,
      annualInterestRate: 12,
      tenureMonths: 6,
      status: 'active',
      createdAt,
    };
    const loanDoc = {
      id: 'loan_001',
      data: () => loanData,
    };
    const userRef = { id: 'borrower_001' };
    const countResult = (count: number) => ({
      get: jest.fn().mockResolvedValue({ data: () => ({ count }) }),
    });
    const query: any = {
      aggregate: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          data: () => ({
            totalLoans: 1,
            totalPrincipalMinor: 12000000,
            outstandingBalanceMinor: 8480000,
          }),
        }),
      })),
      where: jest
        .fn()
        .mockImplementation((_field: string, _operator: string, value: string) =>
          ({ count: () => countResult(value === 'active' ? 1 : 0) }),
        ),
      orderBy: jest.fn(),
      limit: jest.fn(),
      get: jest.fn().mockResolvedValue({ docs: [loanDoc] }),
    };
    query.orderBy.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    const db = {
      collection: jest.fn((name: string) => {
        if (name === 'loans') {
          return {
            where: jest.fn(() => query),
          };
        }

        return { doc: jest.fn(() => userRef) };
      }),
      getAll: jest.fn().mockResolvedValue([
        {
          id: 'borrower_001',
          data: () => ({
            fullName: 'Amal Perera',
            email: 'amal@example.com',
          }),
        },
      ]),
    };
    const service = new LenderLoansService({ getDb: () => db } as any);

    const result = await service.getLoans('lender_001');

    expect(result.summary).toMatchObject({
      totalLoans: 1,
      activeLoans: 1,
      totalPrincipal: 120000,
      outstandingBalance: 84800,
    });
    expect(result.loans[0]).toMatchObject({
      id: 'loan_001',
      principal: 120000,
      remainingBalance: 84800,
      borrower: {
        id: 'borrower_001',
        fullName: 'Amal Perera',
      },
    });
    expect(query.limit).toHaveBeenCalledWith(16);
    expect((loanDoc as any).ref).toBeUndefined();
  });
});
