import { Test, TestingModule } from '@nestjs/testing';
import { DisputesService } from './disputes.service';
import { FirebaseService } from '../../firebase/firebase.service';

describe('DisputesService', () => {
  let service: DisputesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputesService,
        {
          provide: FirebaseService,
          useValue: {
            db: {
              collection: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DisputesService>(DisputesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
