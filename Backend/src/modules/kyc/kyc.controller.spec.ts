import { Test, TestingModule } from '@nestjs/testing';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { AdminJwtGuard } from '../admin/admin-auth/guards/admin-jwt.guard';

describe('KycController', () => {
  let controller: KycController;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [KycController],
      providers: [
        {
          provide: KycService,
          useValue: {},
        },
      ],
    });

    moduleBuilder
      .overrideGuard(AdminJwtGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get<KycController>(KycController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
