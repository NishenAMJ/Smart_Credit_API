import { Test, TestingModule } from '@nestjs/testing';
import { LenderController } from './lender.controller';
import { LenderService } from './lender.service';
import { ApiKeyGuard } from '../../guards/api-key.guard';
import { CreateLenderDto } from './dto/create-lender.dto';
import { CreateLoanOfferDto } from './dto/create-loan-offer.dto';
import { UpdateLenderDto } from './dto/update-lender.dto';
import { ConfigService } from '@nestjs/config';

describe('LenderController', () => {
  let controller: LenderController;
  let service: LenderService;

  const mockLenderService = {
    createLender: jest.fn(),
    findLenderById: jest.fn(),
    updateLender: jest.fn(),
    getAllLenders: jest.fn(),
    createLoanOffer: jest.fn(),
    getLoanOffersByLender: jest.fn(),
    updateLoanOffer: jest.fn(),
    getDashboardStats: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-api-key'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LenderController],
      providers: [
        {
          provide: LenderService,
          useValue: mockLenderService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        ApiKeyGuard,
      ],
    }).compile();

    controller = module.get<LenderController>(LenderController);
    service = module.get<LenderService>(LenderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createLender', () => {
    it('should create a new lender', async () => {
      const createLenderDto: CreateLenderDto = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        investmentCapacity: 100000,
        riskPreference: 'medium',
      };

      const mockResult = {
        id: 'lender123',
        ...createLenderDto,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockLenderService.createLender.mockResolvedValue(mockResult);

      const result = await controller.createLender(createLenderDto);

      expect(result).toEqual(mockResult);
      expect(service.createLender).toHaveBeenCalledWith(createLenderDto);
    });
  });

  describe('getLenderById', () => {
    it('should return lender by id', async () => {
      const mockLender = {
        id: 'lender123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        investmentCapacity: 100000,
        riskPreference: 'medium',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockLenderService.findLenderById.mockResolvedValue(mockLender);

      const result = await controller.getLenderById('lender123');

      expect(result).toEqual(mockLender);
      expect(service.findLenderById).toHaveBeenCalledWith('lender123');
    });
  });

  describe('updateLender', () => {
    it('should update lender', async () => {
      const updateDto: UpdateLenderDto = {
        phone: '+9876543210',
        investmentCapacity: 150000,
      };

      const mockResult = {
        id: 'lender123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+9876543210',
        investmentCapacity: 150000,
        riskPreference: 'medium',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRequest = {
        user: {
          id: 'user123',
          lenderProfileId: 'lender123',
          role: 'lender',
        },
      };

      mockLenderService.updateLender.mockResolvedValue(mockResult);

      const result = await controller.updateLender('lender123', updateDto, mockRequest);

      expect(result).toEqual(mockResult);
      expect(service.updateLender).toHaveBeenCalledWith('lender123', updateDto);
    });
  });

  describe('getAllLenders', () => {
    it('should return all lenders', async () => {
      const mockLenders = [
        {
          id: 'lender123',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          investmentCapacity: 100000,
          riskPreference: 'medium',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'lender456',
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+1234567891',
          investmentCapacity: 200000,
          riskPreference: 'high',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockLenderService.getAllLenders.mockResolvedValue(mockLenders);

      const result = await controller.getAllLenders();

      expect(result).toEqual(mockLenders);
      expect(service.getAllLenders).toHaveBeenCalled();
    });
  });

  describe('createLoanOffer', () => {
    it('should create loan offer and override lenderId from param', async () => {
      const createOfferDto: CreateLoanOfferDto = {
        lenderId: 'wrong-id',
        amount: 50000,
        interestRate: 12.5,
        tenure: 12,
        minCreditScore: 650,
      };

      const mockResult = {
        id: 'offer456',
        lenderId: 'lender123',
        amount: 50000,
        interestRate: 12.5,
        tenure: 12,
        minCreditScore: 650,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRequest = {
        user: {
          id: 'user123',
          lenderProfileId: 'lender123',
          role: 'lender',
        },
      };

      mockLenderService.createLoanOffer.mockResolvedValue(mockResult);

      const result = await controller.createLoanOffer('lender123', createOfferDto, mockRequest);

      expect(result).toEqual(mockResult);
      expect(createOfferDto.lenderId).toBe('lender123'); // Should be overridden
      expect(service.createLoanOffer).toHaveBeenCalledWith(createOfferDto);
    });
  });

  describe('getLenderOffers', () => {
    it('should return all offers for a lender', async () => {
      const mockOffers = [
        {
          id: 'offer1',
          lenderId: 'lender123',
          amount: 50000,
          interestRate: 12.5,
          tenure: 12,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'offer2',
          lenderId: 'lender123',
          amount: 75000,
          interestRate: 13.0,
          tenure: 24,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockLenderService.getLoanOffersByLender.mockResolvedValue(mockOffers);

      const result = await controller.getLenderOffers('lender123');

      expect(result).toEqual(mockOffers);
      expect(service.getLoanOffersByLender).toHaveBeenCalledWith('lender123');
    });
  });

  describe('getDashboard', () => {
    it('should return dashboard statistics', async () => {
      const mockStats = {
        totalActiveOffers: 5,
        totalAmountOffered: 250000,
        totalLoansIssued: 3,
        totalReturns: 15000,
        activeLoansCount: 2,
      };

      const mockRequest = {
        user: {
          id: 'user123',
          lenderProfileId: 'lender123',
          role: 'lender',
        },
      };

      mockLenderService.getDashboardStats.mockResolvedValue(mockStats);

      const result = await controller.getDashboard('lender123', mockRequest);

      expect(result).toEqual(mockStats);
      expect(service.getDashboardStats).toHaveBeenCalledWith('lender123');
    });
  });
});
