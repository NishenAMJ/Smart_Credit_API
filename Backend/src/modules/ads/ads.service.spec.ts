import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdsService } from './ads.service';
import { FirebaseService } from '../../firebase/firebase.service';

describe('AdsService', () => {
  let service: AdsService;
  const getMock = jest.fn();
  const updateMock = jest.fn();
  const deleteMock = jest.fn();
  const whereGetMock = jest.fn();
  const nestedWhereGetMock = jest.fn();
  const secondWhereMock = jest.fn(() => ({ get: nestedWhereGetMock }));
  const whereMock = jest.fn((field: string, op: string, value: string | null) => {
    if (field === 'lenderId' && op === '!=' && value === null) {
      return {
        get: whereGetMock,
        where: secondWhereMock,
      };
    }

    return { get: whereGetMock };
  });
  const docMock = jest.fn(() => ({
    get: getMock,
    update: updateMock,
    delete: deleteMock,
  }));
  const collectionMock = jest.fn(() => ({
    where: whereMock,
    doc: docMock,
  }));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdsService,
        {
          provide: FirebaseService,
          useValue: {
            db: {
              collection: collectionMock,
            },
          },
        },
      ],
    }).compile();

    service = module.get<AdsService>(AdsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns only lender ads from the collection query', async () => {
    whereGetMock.mockResolvedValue({
      docs: [
        {
          id: 'ad-1',
          data: () => ({ lenderId: 'lender-1', status: 'approved', title: 'Lender ad' }),
        },
      ],
    });

    const result = await service.getAllAds();

    expect(whereMock).toHaveBeenCalledWith('lenderId', '!=', null);
    expect(result.count).toBe(1);
    expect(result.ads[0].lenderId).toBe('lender-1');
  });

  it('rejects moderation of non-lender ads', async () => {
    getMock.mockResolvedValue({
      exists: true,
      data: () => ({ borrowerId: 'borrower-1' }),
      id: 'ad-2',
    });

    await expect(service.getAdById('ad-2')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('moves an approved lender ad back to pending review', async () => {
    getMock.mockResolvedValue({
      exists: true,
      data: () => ({ lenderId: 'lender-1', status: 'approved' }),
      id: 'ad-3',
    });

    const result = await service.updateAdStatus('ad-3', 'pending');

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
        notes: 'Moved back to pending review by admin',
      }),
    );
    expect(result.status).toBe('pending');
  });

  it('requires a reason when moving a lender ad to rejected', async () => {
    await expect(service.updateAdStatus('ad-4', 'rejected')).rejects.toThrow(
      'Rejection reason is required',
    );
  });
});
