import { Test, TestingModule } from '@nestjs/testing';
import { LenderController } from './lender.controller';
import { LenderService } from './lender.service';

describe('LenderController', () => {
  let controller: LenderController;
  const lenderService = {
    getDashboardSummary: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LenderController],
      providers: [
        {
          provide: LenderService,
          useValue: lenderService,
        },
      ],
    }).compile();

    controller = module.get<LenderController>(LenderController);
    lenderService.getDashboardSummary.mockReset();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should load summary for the authenticated lender', async () => {
    lenderService.getDashboardSummary.mockResolvedValue({
      summary: {
        totalBorrowers: 2,
        todaysCollection: 1500,
        overduePayments: 1,
        activeAds: 3,
      },
      generatedAt: '2026-04-29T00:00:00.000Z',
    });

    const result = await controller.getDashboardSummary({
      user: {
        sub: 'lender-1',
        email: 'lender@example.com',
        role: 'lender',
      },
    } as any);

    expect(lenderService.getDashboardSummary).toHaveBeenCalledWith('lender-1');
    expect(result.summary.totalBorrowers).toBe(2);
  });
});
