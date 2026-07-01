import { BorrowerLoansService } from './borrower-loans.service';
import { LoanStatus } from '../types/borrower.types';

describe('BorrowerLoansService', () => {
  let borrowerService: {
    getActiveLoanAds: jest.Mock;
    getLoans: jest.Mock;
    getLoanById: jest.Mock;
  };
  let service: BorrowerLoansService;

  beforeEach(() => {
    borrowerService = {
      getActiveLoanAds: jest.fn(),
      getLoans: jest.fn(),
      getLoanById: jest.fn(),
    };
    service = new BorrowerLoansService(borrowerService as any);
  });

  it('should search active loan ads by lender name', async () => {
    borrowerService.getActiveLoanAds.mockResolvedValueOnce([
      { lenderName: 'City Bank' },
      { lenderName: 'Village Finance' },
    ]);

    await expect(service.searchLoans('city')).resolves.toEqual([
      { lenderName: 'City Bank' },
    ]);
  });

  it('should delegate borrower loan lookup', () => {
    borrowerService.getLoans.mockReturnValueOnce([]);

    expect(service.getLoans('borrower-1', LoanStatus.ACTIVE)).toEqual([]);
    expect(borrowerService.getLoans).toHaveBeenCalledWith(
      'borrower-1',
      LoanStatus.ACTIVE,
    );
  });
});

