import { Test, TestingModule } from '@nestjs/testing';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('DisputesController', () => {
  let controller: DisputesController;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [DisputesController],
      providers: [
        {
          provide: DisputesService,
          useValue: {},
        },
      ],
    });

    moduleBuilder
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) });

    moduleBuilder
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get<DisputesController>(DisputesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
