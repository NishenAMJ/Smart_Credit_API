import { CreditScoreService } from './credit-score.service';

describe('CreditScoreService', () => {
  it('should return the matching rating for a score', () => {
    const service = new CreditScoreService({} as any);

    expect(service.getScoreRating(760)).toBe('Excellent');
    expect(service.getScoreRating(520)).toBe('Poor');
  });

  it('reads the canonical nested borrower score and KYC status', async () => {
    const db = {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(async () => ({
            exists: true,
            data: () => ({
              fullName: 'Borrower One',
              phone: '+94770000000',
              kycStatus: 'approved',
              scoreLastCalculated: new Date(),
              borrowerProfile: {
                creditScore: 735,
                dateOfBirth: new Date(),
                occupation: 'Engineer',
                monthlyIncomeMinor: 25_000_000,
              },
            }),
          })),
        })),
      })),
    };
    const service = new CreditScoreService({ db } as any);

    await expect(service.getSummary('borrower_1')).resolves.toMatchObject({
      score: 735,
      rating: 'Good',
      kycVerified: true,
      canApplyForLoan: true,
    });
  });
});
