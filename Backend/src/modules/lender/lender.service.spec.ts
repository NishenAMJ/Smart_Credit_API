import { Test, TestingModule } from '@nestjs/testing';
import { LenderService } from './lender.service';
import { FirebaseService } from '../../firebase/firebase.service';
import { NotFoundException } from '@nestjs/common';
import { CreateLenderDto } from './dto/create-lender.dto';
import { CreateLoanOfferDto } from './dto/create-loan-offer.dto';
import { UpdateLenderDto } from './dto/update-lender.dto';

describe('LenderService', () => {
  let service: LenderService;
  let firebaseService: FirebaseService;

  const mockFirebaseService = {
    db: {
      collection: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LenderService,
        {
          provide: FirebaseService,
          useValue: mockFirebaseService,
        },
      ],
    }).compile();

    service = module.get<LenderService>(LenderService);
    firebaseService = module.get<FirebaseService>(FirebaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLender', () => {
    it('should create a lender and return with id', async () => {
      const createLenderDto: CreateLenderDto = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        investmentCapacity: 100000,
        riskPreference: 'medium',
      };

      const mockDocRef = { id: 'lender123' };
      const mockAdd = jest.fn().mockResolvedValue(mockDocRef);
      const mockCollection = jest.fn().mockReturnValue({ add: mockAdd });

      mockFirebaseService.db.collection = mockCollection;

      const result = await service.createLender(createLenderDto);

      expect(result).toHaveProperty('id', 'lender123');
      expect(result).toHaveProperty('name', 'John Doe');
      expect(result).toHaveProperty('email', 'john@example.com');
      expect(result).toHaveProperty('status', 'active');
      expect(result).toHaveProperty('createdAt');
      expect(mockCollection).toHaveBeenCalledWith('lenders');
    });
  });

  describe('findLenderById', () => {
    it('should return lender when found', async () => {
      const mockData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        investmentCapacity: 100000,
        riskPreference: 'medium',
        status: 'active',
      };

      const mockDoc = {
        id: 'lender123',
        exists: true,
        data: jest.fn().mockReturnValue(mockData),
      };

      const mockGet = jest.fn().mockResolvedValue(mockDoc);
      const mockDocRef = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDocRef });

      mockFirebaseService.db.collection = mockCollection;

      const result = await service.findLenderById('lender123');

      expect(result).toHaveProperty('id', 'lender123');
      expect(result).toHaveProperty('name', 'John Doe');
      expect(mockCollection).toHaveBeenCalledWith('lenders');
      expect(mockDocRef).toHaveBeenCalledWith('lender123');
    });

    it('should throw NotFoundException when lender not found', async () => {
      const mockDoc = {
        exists: false,
      };

      const mockGet = jest.fn().mockResolvedValue(mockDoc);
      const mockDocRef = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDocRef });

      mockFirebaseService.db.collection = mockCollection;

      await expect(service.findLenderById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateLender', () => {
    it('should update lender and return updated data', async () => {
      const updateDto: UpdateLenderDto = {
        phone: '+9876543210',
        investmentCapacity: 150000,
      };

      const mockData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+9876543210',
        investmentCapacity: 150000,
        riskPreference: 'medium',
      };

      const mockDoc = {
        id: 'lender123',
        exists: true,
        data: jest.fn().mockReturnValue(mockData),
      };

      const mockGet = jest.fn().mockResolvedValue(mockDoc);
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockDocRef = {
        get: mockGet,
        update: mockUpdate,
      };
      const mockDocFunc = jest.fn().mockReturnValue(mockDocRef);
      const mockCollection = jest.fn().mockReturnValue({ doc: mockDocFunc });

      mockFirebaseService.db.collection = mockCollection;

      const result = await service.updateLender('lender123', updateDto);

      expect(result).toHaveProperty('id', 'lender123');
      expect(result).toHaveProperty('phone', '+9876543210');
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('createLoanOffer', () => {
    it('should create loan offer when lender exists', async () => {
      const createOfferDto: CreateLoanOfferDto = {
        lenderId: 'lender123',
        amount: 50000,
        interestRate: 12.5,
        tenure: 12,
        minCreditScore: 650,
      };

      const mockLenderDoc = {
        exists: true,
      };

      const mockOfferDocRef = { id: 'offer456' };
      const mockAddOffer = jest.fn().mockResolvedValue(mockOfferDocRef);
      const mockGetLender = jest.fn().mockResolvedValue(mockLenderDoc);
      const mockLenderDocRef = jest.fn().mockReturnValue({ get: mockGetLender });

      const mockCollection = jest.fn((collectionName: string) => {
        if (collectionName === 'lenders') {
          return { doc: mockLenderDocRef };
        }
        if (collectionName === 'loanOffers') {
          return { add: mockAddOffer };
        }
      });

      mockFirebaseService.db.collection = mockCollection;

      const result = await service.createLoanOffer(createOfferDto);

      expect(result).toHaveProperty('id', 'offer456');
      expect(result).toHaveProperty('lenderId', 'lender123');
      expect(result).toHaveProperty('amount', 50000);
      expect(result).toHaveProperty('status', 'active');
    });

    it('should throw NotFoundException when lender does not exist', async () => {
      const createOfferDto: CreateLoanOfferDto = {
        lenderId: 'nonexistent',
        amount: 50000,
        interestRate: 12.5,
        tenure: 12,
      };

      const mockLenderDoc = {
        exists: false,
      };

      const mockGetLender = jest.fn().mockResolvedValue(mockLenderDoc);
      const mockLenderDocRef = jest.fn().mockReturnValue({ get: mockGetLender });
      const mockCollection = jest.fn().mockReturnValue({ doc: mockLenderDocRef });

      mockFirebaseService.db.collection = mockCollection;

      await expect(service.createLoanOffer(createOfferDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getLoanOffersByLender', () => {
    it('should return all loan offers for a lender', async () => {
      const mockOffers = [
        {
          id: 'offer1',
          lenderId: 'lender123',
          amount: 50000,
          interestRate: 12.5,
          tenure: 12,
          status: 'active',
        },
        {
          id: 'offer2',
          lenderId: 'lender123',
          amount: 75000,
          interestRate: 13.0,
          tenure: 24,
          status: 'active',
        },
      ];

      const mockDocs = mockOffers.map((offer) => ({
        id: offer.id,
        data: jest.fn().mockReturnValue(offer),
      }));

      const mockSnapshot = {
        docs: mockDocs,
      };

      const mockGet = jest.fn().mockResolvedValue(mockSnapshot);
      const mockWhere = jest.fn().mockReturnValue({ get: mockGet });
      const mockCollection = jest.fn().mockReturnValue({ where: mockWhere });

      mockFirebaseService.db.collection = mockCollection;

      const result = await service.getLoanOffersByLender('lender123');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id', 'offer1');
      expect(mockWhere).toHaveBeenCalledWith('lenderId', '==', 'lender123');
    });
  });

  describe('getDashboardStats', () => {
    it('should calculate dashboard statistics correctly', async () => {
      const mockLenderDoc = {
        exists: true,
      };

      const mockOffers = [
        {
          id: 'offer1',
          lenderId: 'lender123',
          amount: 50000,
          status: 'active',
        },
        {
          id: 'offer2',
          lenderId: 'lender123',
          amount: 75000,
          status: 'active',
        },
        {
          id: 'offer3',
          lenderId: 'lender123',
          amount: 30000,
          status: 'inactive',
        },
      ];

      const mockOfferDocs = mockOffers.map((offer) => ({
        id: offer.id,
        data: jest.fn().mockReturnValue(offer),
      }));

      const mockOfferSnapshot = {
        docs: mockOfferDocs,
      };

      const mockGetLender = jest.fn().mockResolvedValue(mockLenderDoc);
      const mockGetOffers = jest.fn().mockResolvedValue(mockOfferSnapshot);
      const mockLenderDocRef = jest.fn().mockReturnValue({ get: mockGetLender });
      const mockWhere = jest.fn().mockReturnValue({ get: mockGetOffers });

      const mockCollection = jest.fn((collectionName: string) => {
        if (collectionName === 'lenders') {
          return { doc: mockLenderDocRef };
        }
        if (collectionName === 'loanOffers') {
          return { where: mockWhere };
        }
      });

      mockFirebaseService.db.collection = mockCollection;

      const result = await service.getDashboardStats('lender123');

      expect(result).toHaveProperty('totalActiveOffers', 2);
      expect(result).toHaveProperty('totalAmountOffered', 125000);
      expect(result).toHaveProperty('totalLoansIssued', 0);
      expect(result).toHaveProperty('totalReturns', 0);
      expect(result).toHaveProperty('activeLoansCount', 0);
    });
  });
});
