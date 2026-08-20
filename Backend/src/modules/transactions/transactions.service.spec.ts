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

  it('shares one Firestore listener across connected admin subscribers', () => {
    const unsubscribe = jest.fn();
    const onSnapshot = jest.fn(() => unsubscribe);
    const query = {
      orderBy: jest.fn(),
      limit: jest.fn(),
      onSnapshot,
    };
    query.orderBy.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    const sharedService = new TransactionsService({
      db: {
        collection: jest.fn(() => query),
        getAll: jest.fn(),
      },
    } as unknown as FirebaseService);

    const first = sharedService.streamTransactions(10).subscribe();
    const second = sharedService.streamTransactions(20).subscribe();

    expect(onSnapshot).toHaveBeenCalledTimes(1);
    first.unsubscribe();
    expect(unsubscribe).not.toHaveBeenCalled();
    second.unsubscribe();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
