import { Test, TestingModule } from '@nestjs/testing';
import { BorrowerService } from './borrower.service';
import { FirebaseService } from '../../firebase/firebase.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { LoanStatus } from './interfaces/borrower.interface';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Baseline wiring tests for `BorrowerService`.
 */
describe('BorrowerService', () => {
  let service: BorrowerService;

  /**
   * Create Mock functions for Firestore fluent API
   */
  const mockGet = jest.fn();
  const mockWhere = jest.fn();
  const mockDoc = jest.fn();
  const mockUpdate = jest.fn();
  const mockSet = jest.fn();

  // Support for .where().where().get() chaining
  const mockQuery = {
    where: mockWhere,
    get: mockGet,
  };
  mockWhere.mockReturnValue(mockQuery);

  const mockCollectionRef = {
    doc: mockDoc,
    where: mockWhere,
    get: mockGet,
  };

  const mockCollection = jest.fn().mockReturnValue(mockCollectionRef);

  // Support for .doc().get() and .doc().update()
  mockDoc.mockReturnValue({ get: mockGet, update: mockUpdate, set: mockSet });

  /**
   * Create a mock FirebaseService that returns our mocked DB
   */

  const mockFirebaseService = {
    db: {
      collection: mockCollection,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BorrowerService,
        {
          provide: FirebaseService,
          useValue: mockFirebaseService, //use mock instead of the real FirebaseService
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BorrowerService>(BorrowerService);
  });

  /*
   *Clear mock history after each test
   */
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLoanById', () => {
    it('should return the loan if exists', async () => {
      //Setup our mock database
      const mockLoanData = {
        loanId: 'loan_1',
        borrowerId: 'borrower_1',
        status: LoanStatus.ACTIVE,
        principalAmount: 100000,
        tenureMonths: 10,
        totalRepayable: 120000,
      };
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => mockLoanData,
      });

      //Call the method we are testing
      const result = await service.getLoanById('loan_1', 'borrower_1');
      //verify the results
      expect(result).toMatchObject({
        loanId: 'loan_1',
        borrowerId: 'borrower_1',
        status: LoanStatus.ACTIVE,
        principalAmount: 100000,
        tenureMonths: 10,
        monthlyInstallment: 12000,
        outstandingBalance: 120000,
      });
      expect(mockCollection).toHaveBeenCalledWith('loans');

      expect(mockDoc).toHaveBeenCalledWith('loan_1');
    });
    it('should throw NotFoundException if the loan document does not exist', async () => {
      // Arrange: Database returns exists: false
      mockGet.mockResolvedValueOnce({
        exists: false,
      });
      // Act & Assert: We expect the promise to reject with a NotFoundException
      await expect(
        service.getLoanById('invalid_loan', 'borrower_1'),
      ).rejects.toThrow(NotFoundException);
    });
    it('should throw ForbiddenException if the loan belongs to a different borrower', async () => {
      // Arrange: Database returns a loan, but the borrowerId is different
      const mockLoanData = {
        loanId: 'loan_1',
        borrowerId: 'different_borrower',
      };
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => mockLoanData,
      });
      // Act & Assert: We expect it to throw a ForbiddenException
      await expect(service.getLoanById('loan_1', 'borrower_1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getLoans', () => {
    it('should query loans collection by borrowerId', async () => {
      // Arrange
      const mockDocs = [
        { data: () => ({ loanId: '1', borrowerId: 'b_1' }) },
        { data: () => ({ loanId: '2', borrowerId: 'b_1' }) },
      ];
      mockGet.mockResolvedValueOnce({ docs: mockDocs });

      // Act
      const result = await service.getLoans('b_1');

      // Assert
      expect(mockCollection).toHaveBeenCalledWith('loans');
      expect(mockWhere).toHaveBeenCalledWith('borrowerId', '==', 'b_1');
      expect(result).toHaveLength(2);
      expect(result.map((loan) => loan.loanId)).toEqual(
        expect.arrayContaining(['1', '2']),
      );
    });

    it('should chain a status filter if provided', async () => {
      // Arrange
      mockGet.mockResolvedValueOnce({ docs: [] });

      // Act
      await service.getLoans('b_1', LoanStatus.ACTIVE);

      // Assert
      expect(mockWhere).toHaveBeenCalledWith('borrowerId', '==', 'b_1');
      expect(mockWhere).toHaveBeenCalledWith('status', '==', LoanStatus.ACTIVE);
    });
  });

  describe('getLenderNamesMap', () => {
    it('should return an empty map if no IDs are provided', async () => {
      const result = await service.getLenderNamesMap([]);
      expect(result.size).toBe(0);
      expect(mockCollection).not.toHaveBeenCalled();
    });

    it('should fetch and map lender names', async () => {
      // Arrange
      mockGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ userId: 'lender_1', fullName: 'Bank A' }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ userId: 'lender_2', fullName: 'Bank B' }),
        });

      // Act
      const result = await service.getLenderNamesMap([
        'lender_1',
        'lender_2',
        'lender_1',
      ]);

      // Assert
      expect(mockCollection).toHaveBeenCalledWith('users');
      // Should deduplicate the array
      expect(mockDoc).toHaveBeenCalledWith('lender_1');
      expect(mockDoc).toHaveBeenCalledWith('lender_2');
      expect(result.get('lender_1')).toBe('Bank A');
      expect(result.get('lender_2')).toBe('Bank B');
    });
  });
});
