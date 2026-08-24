import { BorrowerDashboardService } from './borrower-dashboard.service';
import { LoanStatus } from '../types/borrower.types';

describe('BorrowerDashboardService', () => {
  it('should be defined', () => {
    const service = new BorrowerDashboardService({} as any);

    expect(service).toBeDefined();
  });

  it('recognizes pending disbursement without treating it as active', () => {
    const service = new BorrowerDashboardService({} as any);

    expect((service as any).normalizeLoanStatus('pending_disbursement')).toBe(
      LoanStatus.PENDING_DISBURSEMENT,
    );
    expect((service as any).normalizeLoanStatus('future_state')).toBe(
      LoanStatus.UNKNOWN,
    );
  });

  it('aggregates canonical minor-unit loan values and excludes unfunded loans', async () => {
    const loanDocuments = [
      {
        id: 'active-loan',
        data: () => ({
          borrowerId: 'borrower-1',
          status: 'ACTIVE',
          principalMinor: 10_000_000,
          interestAmountMinor: 1_200_000,
          totalRepayableMinor: 11_200_000,
          amountPaidMinor: 1_000_000,
          remainingBalanceMinor: 10_200_000,
          monthlyInstallmentMinor: 1_120_000,
          tenureMonths: 10,
        }),
      },
      {
        id: 'completed-loan',
        data: () => ({
          borrowerId: 'borrower-1',
          status: LoanStatus.COMPLETED,
          principalMinor: 5_000_000,
          interestAmountMinor: 500_000,
          totalRepayableMinor: 5_500_000,
          amountPaidMinor: 5_500_000,
          remainingBalanceMinor: 0,
          tenureMonths: 5,
        }),
      },
      {
        id: 'awaiting-disbursement',
        data: () => ({
          borrowerId: 'borrower-1',
          status: LoanStatus.PENDING_DISBURSEMENT,
          principalMinor: 3_000_000,
          interestAmountMinor: 300_000,
          totalRepayableMinor: 3_300_000,
          amountPaidMinor: 0,
          remainingBalanceMinor: 3_300_000,
          tenureMonths: 3,
        }),
      },
    ];
    const usersGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ fullName: 'Test Borrower', creditScore: 620 }),
    });
    const loansGet = jest.fn().mockResolvedValue({
      forEach: (callback: (doc: (typeof loanDocuments)[number]) => void) =>
        loanDocuments.forEach(callback),
    });
    const applicationsCountGet = jest
      .fn()
      .mockResolvedValue({ data: () => ({ count: 2 }) });
    const applicationQuery = {
      where: jest.fn(),
      count: jest.fn(() => ({ get: applicationsCountGet })),
    };
    applicationQuery.where.mockReturnValue(applicationQuery);

    const db = {
      collection: jest.fn((name: string) => {
        if (name === 'users') {
          return { doc: () => ({ get: usersGet }) };
        }
        if (name === 'loans') {
          return { where: () => ({ get: loansGet }) };
        }
        if (name === 'loanApplications') {
          return applicationQuery;
        }
        throw new Error(`Unexpected collection: ${name}`);
      }),
    };
    const service = new BorrowerDashboardService({ db } as any);

    const result = await service.getDashboard('borrower-1');

    expect(result.data).toMatchObject({
      activeLoans: 1,
      pendingApplications: 2,
      totalOutstanding: 102_000,
      creditScore: 620,
      totalBorrowed: 150_000,
      totalRepaid: 65_000,
    });
  });
});
