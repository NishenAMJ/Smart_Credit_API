import { CreditScoreService } from './credit-score.service';

describe('CreditScoreService', () => {
  it('should return the matching rating for a score', () => {
    const service = new CreditScoreService({} as any);

    expect(service.getScoreRating(760)).toBe('Excellent');
    expect(service.getScoreRating(520)).toBe('Poor');
  });
});

