import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { FirebaseService } from '../../firebase/firebase.service';

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: FirebaseService,
          useValue: {
            db: {
              collection: jest.fn(() => ({
                orderBy: jest.fn(() => ({
                  limit: jest.fn(() => ({
                    get: jest.fn(),
                  })),
                  get: jest.fn(),
                })),
                doc: jest.fn(() => ({ get: jest.fn() })),
              })),
              getAll: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
