import { Test, TestingModule } from '@nestjs/testing';
import { BorrowerController } from './borrower.controller';
import { BorrowerPaymentsController } from './payments/borrower-payments.controller';
import { BorrowerService } from './borrower.service';
import { BorrowerApplicationsService } from './applications/borrower-applications.service';
import { BorrowerDashboardService } from './dashboard/borrower-dashboard.service';
import { BorrowerSupportService } from './support/borrower-support.service';
import { CreditScoreService } from './credit-score/credit-score.service';

/**
 * Baseline wiring tests for `BorrowerController`.
 */
describe('BorrowerController', () => {
  let controller: BorrowerController;
  let paymentsController: BorrowerPaymentsController;
  let service: BorrowerService;

  beforeEach(async () => {
    const mockBorrowerService = {
      createProfile: jest.fn(),
      getDashboard: jest.fn(),
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      getLoans: jest.fn(),
      getLenderNamesMap: jest.fn(),
      getRepaymentHistory: jest.fn(),
      getBorrowerLoanInstallments: jest.fn().mockResolvedValue([]),
      getBorrowerRepaymentTransactions: jest.fn().mockResolvedValue([]),
    };
    const mockCreditScoreService = {
      getSummary: jest.fn(),
      getScoreHistory: jest.fn(),
      calculateCreditScore: jest.fn(),
      getScoreRating: jest.fn(),
    };
    const mockBorrowerApplicationsService = {
      createLoanApplication: jest.fn(),
      getLoanApplications: jest.fn(),
      getLoanApplicationById: jest.fn(),
      updateLoanApplication: jest.fn(),
      submitLoanApplication: jest.fn(),
      deleteLoanApplication: jest.fn(),
    };
    const mockBorrowerDashboardService = {
      getDashboard: jest.fn(),
    };
    const mockBorrowerSupportService = {
      getSupportStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BorrowerController, BorrowerPaymentsController],
      providers: [
        {
          provide: BorrowerService,
          useValue: mockBorrowerService,
        },
        {
          provide: BorrowerApplicationsService,
          useValue: mockBorrowerApplicationsService,
        },
        {
          provide: BorrowerDashboardService,
          useValue: mockBorrowerDashboardService,
        },
        {
          provide: BorrowerSupportService,
          useValue: mockBorrowerSupportService,
        },
        {
          provide: CreditScoreService,
          useValue: mockCreditScoreService,
        },
      ],
    }).compile();

    controller = module.get<BorrowerController>(BorrowerController);
    paymentsController = module.get<BorrowerPaymentsController>(
      BorrowerPaymentsController,
    );
    service = module.get<BorrowerService>(BorrowerService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return a user profile successfully', async () => {
      // Arrange
      const mockProfile = { userId: 'user_1', fullName: 'John Doe' };
      jest
        .spyOn(service, 'getProfile')
        .mockResolvedValueOnce(mockProfile as any);

      // Act
      const result = await controller.getProfile('user_1');

      // Assert
      expect(result).toEqual(mockProfile);
      expect(service.getProfile).toHaveBeenCalledWith('user_1');
    });
  });

  describe('getMyPayments', () => {
    it('should aggregate upcoming payments and past history successfully', async () => {
      // Arrange
      const mockLoans = [
        {
          loanId: 'loan_1',
          lenderId: 'lender_1',
          status: 'active',
          outstandingBalance: 1000,
          monthlyInstallment: 500,
          nextDueDate: new Date('2025-05-01T00:00:00Z'),
        },
      ];

      const mockLenderMap = new Map();
      mockLenderMap.set('lender_1', 'Global Bank');

      const mockHistory = [
        { repaymentId: 'rep_1', loanId: 'loan_1', amount: 500, status: 'PAID' },
      ];

      jest.spyOn(service, 'getLoans').mockResolvedValueOnce(mockLoans as any);
      jest
        .spyOn(service, 'getLenderNamesMap')
        .mockResolvedValueOnce(mockLenderMap);
      jest
        .spyOn(service, 'getRepaymentHistory')
        .mockResolvedValueOnce(mockHistory as any);

      // Act
      const result = await paymentsController.getMyPayments('user_1');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2); // 1 upcoming + 1 history

      // Verify upcoming payment generation
      const upcoming = result.data.find(
        (p) => p.paymentId === 'upcoming-loan_1',
      );
      expect(upcoming).toBeDefined();
      expect(upcoming.lenderName).toBe('Global Bank'); // injected from map
      expect(upcoming.status).toBe('PENDING');

      // Verify history inclusion
      const history = result.data.find((p) => p.repaymentId === 'rep_1');
      expect(history).toBeDefined();
    });

    it('should sort upcoming payments ascending by dueDate', async () => {
      // Arrange
      const mockLoans = [
        {
          loanId: 'loan_latest',
          lenderId: 'lender_1',
          status: 'active',
          outstandingBalance: 1000,
          monthlyInstallment: 500,
          nextDueDate: new Date('2025-06-01T00:00:00Z'), // June
        },
        {
          loanId: 'loan_earliest',
          lenderId: 'lender_1',
          status: 'active',
          outstandingBalance: 1000,
          monthlyInstallment: 500,
          nextDueDate: new Date('2025-05-01T00:00:00Z'), // May
        },
      ];

      jest.spyOn(service, 'getLoans').mockResolvedValueOnce(mockLoans as any);
      jest.spyOn(service, 'getLenderNamesMap').mockResolvedValueOnce(new Map());
      jest.spyOn(service, 'getRepaymentHistory').mockResolvedValue([]); // return empty array per loan

      // Act
      const result = await paymentsController.getMyPayments('user_1');

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.data[0].loanId).toBe('loan_earliest'); // May should be first
      expect(result.data[1].loanId).toBe('loan_latest'); // June should be second
    });
  });
});
