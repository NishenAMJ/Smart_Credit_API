import { DashboardBorrowersExportService } from './dashboard-borrowers-export.service';
import type { DashboardService } from './dashboard.service';

describe('DashboardBorrowersExportService', () => {
  it('exports lender-linked borrowers by their first loan date', async () => {
    const dashboardService = {
      getBorrowersForExport: jest.fn().mockResolvedValue([
        {
          id: 'borrower_internal_1',
          fullName: 'Nimali Perera',
          email: 'nimali@example.com',
          phone: '+94770000001',
          creditScore: 735,
          kycStatus: 'approved',
          loanCount: 2,
          activeLoansCount: 1,
          totalBorrowedAmount: 500000,
          outstandingAmount: 125000,
          latestLoanStatus: 'active',
          latestLoanCreatedAt: '2026-07-15T03:30:00.000Z',
          firstLoanCreatedAt: '2026-07-10T03:30:00.000Z',
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'borrower_internal_2',
          fullName: 'Outside Range',
          email: 'outside@example.com',
          phone: null,
          creditScore: null,
          kycStatus: 'pending',
          loanCount: 1,
          activeLoansCount: 1,
          totalBorrowedAmount: 100000,
          outstandingAmount: 100000,
          latestLoanStatus: 'active',
          latestLoanCreatedAt: '2026-06-01T00:00:00.000Z',
          firstLoanCreatedAt: '2026-06-01T00:00:00.000Z',
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    };
    const service = new DashboardBorrowersExportService(
      dashboardService as unknown as DashboardService,
    );

    const result = await service.createCsv(
      'lender_1',
      '2026-07-10',
      '2026-07-10',
    );

    expect(dashboardService.getBorrowersForExport).toHaveBeenCalledWith(
      'lender_1',
    );
    expect(result.recordCount).toBe(1);
    expect(result.fileName).toBe(
      'smart-credit-borrowers-2026-07-10-to-2026-07-10.csv',
    );
    expect(result.csv).toContain('Nimali Perera');
    expect(result.csv).toContain('+94770000001');
    expect(result.csv).toContain('500000.00');
    expect(result.csv).not.toContain('borrower_internal_1');
    expect(result.csv).not.toContain('Outside Range');
  });

  it('protects spreadsheet applications from formula-like borrower data', async () => {
    const dashboardService = {
      getBorrowersForExport: jest.fn().mockResolvedValue([
        {
          id: 'borrower_1',
          fullName: '=HYPERLINK("https://example.com")',
          email: 'borrower@example.com',
          phone: null,
          creditScore: null,
          kycStatus: 'approved',
          loanCount: 1,
          activeLoansCount: 1,
          totalBorrowedAmount: 100,
          outstandingAmount: 50,
          latestLoanStatus: 'active',
          latestLoanCreatedAt: '2026-07-10T00:00:00.000Z',
          firstLoanCreatedAt: '2026-07-10T00:00:00.000Z',
          isActive: true,
          createdAt: '2026-07-10T00:00:00.000Z',
        },
      ]),
    };
    const service = new DashboardBorrowersExportService(
      dashboardService as unknown as DashboardService,
    );

    const result = await service.createCsv(
      'lender_1',
      '2026-07-10',
      '2026-07-10',
    );

    expect(result.csv).toContain("'=HYPERLINK");
  });
});
