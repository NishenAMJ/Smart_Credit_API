import { Test, TestingModule } from '@nestjs/testing';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('AdsController', () => {
  let controller: AdsController;
  const updateAdStatusMock = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdsController],
      providers: [
        {
          provide: AdsService,
          useValue: {
            updateAdStatus: updateAdStatusMock,
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdsController>(AdsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes ad status changes to the service', async () => {
    updateAdStatusMock.mockResolvedValue({
      success: true,
      adId: 'ad-1',
      status: 'pending',
    });

    await controller.updateAdStatus('ad-1', {
      status: 'pending',
      notes: 'Review again',
    });

    expect(updateAdStatusMock).toHaveBeenCalledWith('ad-1', 'pending', {
      reason: undefined,
      notes: 'Review again',
    });
  });
});
