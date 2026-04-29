import { Test, TestingModule } from '@nestjs/testing';
import { LenderService } from './lender.service';
import { FirebaseService } from '../../firebase/firebase.service';

describe('LenderService', () => {
  let service: LenderService;

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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
