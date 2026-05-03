import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdsService } from './ads.service';
import { FirebaseService } from '../../firebase/firebase.service';

describe('AdsService', () => {
  let service: AdsService;
  const getMock = jest.fn();
  const updateMock = jest.fn();
  const deleteMock = jest.fn();
  const countGetMock = jest.fn();
  const countMock = jest.fn(() => ({ get: countGetMock }));
  const whereGetMock = jest.fn();
  const orderByGetMock = jest.fn();
  const limitGetMock = jest.fn();
  const startAfterMock = jest.fn(() => ({
    limit: jest.fn(() => ({ get: limitGetMock })),
  }));
  const limitMock = jest.fn(() => ({ get: limitGetMock }));
  const orderByMock = jest.fn(() => ({
    startAfter: startAfterMock,
    limit: limitMock,
    get: orderByGetMock,
  }));
  const nestedWhereGetMock = jest.fn();
  const secondWhereMock = jest.fn(() => ({ get: nestedWhereGetMock }));
  const approvedLikeGetMock = jest.fn();
  const loanGetMock = jest.fn();
  const whereMock = jest.fn(
    (field: string, op: string, value: string | string[] | null) => {
      if (field === 'status' && op === '==') {
        return { count: countMock, get: whereGetMock, orderBy: orderByMock };
      }

      if (field === 'status' && op === 'in') {
        return { get: approvedLikeGetMock };
      }

      if (field === 'adId' && op === 'in') {
        return { get: loanGetMock };
      }

      if (field === 'lenderId' && op === '!=' && value === null) {
        return {
          get: whereGetMock,
          where: secondWhereMock,
          orderBy: orderByMock,
        };
      }

      return { get: whereGetMock, orderBy: orderByMock };
    },
  );
  const docMock = jest.fn(() => ({
    get: getMock,
    update: updateMock,
    delete: deleteMock,
  }));
  const collectionMock = jest.fn(() => ({
    count: countMock,
    where: whereMock,
    orderBy: orderByMock,
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
    limitGetMock.mockResolvedValue({
      size: 1,
      docs: [
        {
          id: 'ad-1',
          data: () => ({
            lenderId: 'lender-1',
            status: 'approved',
            title: 'Lender ad',
          }),
        },
      ],
    });
    loanGetMock.mockResolvedValue({
      docs: [],
    });

    const result = await service.getAllAds();

    expect(collectionMock).toHaveBeenCalledWith('ads');
    expect(orderByMock).toHaveBeenCalledWith('createdAt', 'desc');
    expect(result.count).toBe(1);
    expect(result.ads[0].lenderId).toBe('lender-1');
    expect(result.ads[0].status).toBe('approved');
  });

  it('returns aggregate ad stats from firestore counts', async () => {
    countGetMock
      .mockResolvedValueOnce({ data: () => ({ count: 10 }) })
      .mockResolvedValueOnce({ data: () => ({ count: 1 }) })
      .mockResolvedValueOnce({ data: () => ({ count: 2 }) })
      .mockResolvedValueOnce({ data: () => ({ count: 2 }) });
    approvedLikeGetMock.mockResolvedValue({
      docs: [
        { id: 'ad-approved', data: () => ({ lenderId: 'lender-1', status: 'approved' }) },
        { id: 'ad-active-1', data: () => ({ lenderId: 'lender-2', status: 'approved' }) },
        { id: 'ad-active-2', data: () => ({ lenderId: 'lender-3', status: 'active' }) },
      ],
    });
    loanGetMock.mockResolvedValue({
      docs: [
        { data: () => ({ adId: 'ad-active-1' }) },
        { data: () => ({ adId: 'ad-active-2' }) },
      ],
    });

    const result = await service.getAdStats();

    expect(collectionMock).toHaveBeenCalledWith('ads');
    expect(countMock).toHaveBeenCalled();
    expect(result.stats).toEqual({
      all: 10,
      active: 2,
      approved: 1,
      pending: 1,
      rejected: 2,
      closed: 2,
    });
  });

  it('maps an approved ad with a funded loan into active for admin listing', async () => {
    getMock.mockResolvedValue({
      exists: true,
      id: 'ad-5',
      data: () => ({ lenderId: 'lender-1', status: 'approved' }),
    });
    loanGetMock.mockResolvedValue({
      docs: [{ data: () => ({ adId: 'ad-5' }) }],
    });

    const result = await service.getAdById('ad-5');

    expect(result.status).toBe('active');
  });

  it('rejects moderation of non-lender ads', async () => {
    getMock.mockResolvedValue({
      exists: true,
      data: () => ({ borrowerId: 'borrower-1' }),
      id: 'ad-2',
    });

    await expect(service.getAdById('ad-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
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
