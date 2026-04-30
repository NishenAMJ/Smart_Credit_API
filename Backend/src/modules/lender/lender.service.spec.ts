import { Test, TestingModule } from '@nestjs/testing';

import { FirebaseService } from '../../firebase/firebase.service';
import { LenderService } from './lender.service';

describe('LenderService', () => {
  let service: LenderService;
  const lenderBorrowersGet = jest.fn();
  const loansGet = jest.fn();
  const adsGet = jest.fn();
  const paymentsGet = jest.fn();

  const firebaseService = {
    db: {
      collection: jest.fn((name: string) => {
        if (name === 'lenderBorrowers') {
          return {
            where: jest.fn().mockReturnValue({
              get: lenderBorrowersGet,
            }),
          };
        }

        if (name === 'loans') {
          return {
            where: jest.fn().mockReturnValue({
              get: loansGet,
            }),
          };
        }

        if (name === 'ads') {
          return {
            where: jest.fn().mockReturnValue({
              get: adsGet,
            }),
          };
        }

        throw new Error(`Unexpected collection: ${name}`);
      }),
      collectionGroup: jest.fn((name: string) => {
        if (name === 'payments') {
          return {
            where: jest.fn().mockReturnValue({
              get: paymentsGet,
            }),
          };
        }

        throw new Error(`Unexpected collection group: ${name}`);
      }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LenderService,
        {
          provide: FirebaseService,
          useValue: firebaseService,
        },
      ],
    }).compile();

    service = module.get<LenderService>(LenderService);
    lenderBorrowersGet.mockReset();
    loansGet.mockReset();
    adsGet.mockReset();
    paymentsGet.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should build lender dashboard summary from firestore collections', async () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    lenderBorrowersGet.mockResolvedValue({
      docs: [
        { data: () => ({ borrowerId: 'b-1' }) },
        { data: () => ({ borrowerId: 'b-2' }) },
      ],
    });

    loansGet.mockResolvedValue({
      docs: [
        {
          data: () => ({
            borrowerId: 'b-1',
            status: 'active',
            nextDueDate: { toDate: () => yesterday },
          }),
        },
        {
          data: () => ({
            borrowerId: 'b-2',
            status: 'active',
            nextDueDate: { toDate: () => tomorrow },
          }),
        },
      ],
    });

    adsGet.mockResolvedValue({
      docs: [
        {
          data: () => ({
            status: 'active',
            expiresAt: { toDate: () => tomorrow },
          }),
        },
        {
          data: () => ({
            status: 'expired',
            expiresAt: { toDate: () => tomorrow },
          }),
        },
      ],
    });

    paymentsGet.mockResolvedValue({
      docs: [
        {
          data: () => ({
            amount: 1000,
            paidAt: { toDate: () => today },
          }),
        },
        {
          data: () => ({
            amount: 750,
            paidAt: { toDate: () => yesterday },
          }),
        },
      ],
    });

    const result = await service.getDashboardSummary('lender-1');

    expect(result.summary.totalBorrowers).toBe(2);
    expect(result.summary.todaysCollection).toBe(1000);
    expect(result.summary.overduePayments).toBe(1);
    expect(result.summary.activeAds).toBe(1);
    expect(result.generatedAt).toEqual(expect.any(String));
  });

  it('should fall back to unique loan borrower ids when lenderBorrowers are missing', async () => {
    lenderBorrowersGet.mockResolvedValue({ docs: [] });
    loansGet.mockResolvedValue({
      docs: [
        { data: () => ({ borrowerId: 'b-1', status: 'active' }) },
        { data: () => ({ borrowerId: 'b-1', status: 'completed' }) },
        { data: () => ({ borrowerId: 'b-2', status: 'active' }) },
      ],
    });
    adsGet.mockResolvedValue({ docs: [] });
    paymentsGet.mockResolvedValue({ docs: [] });

    const result = await service.getDashboardSummary('lender-1');

    expect(result.summary.totalBorrowers).toBe(2);
  });
});
