import { BorrowerDashboardService } from './borrower-dashboard.service';
import { LoanStatus } from '../types/borrower.types';

describe('BorrowerDashboardService', () => {
  it('should be defined', () => {
    const service = new BorrowerDashboardService({} as any);

    expect(service).toBeDefined();
  });

  it('recognizes pending disbursement without treating it as active', () => {
    const service = new BorrowerDashboardService({} as any);

    expect((service as any).normalizeLoanStatus('pending_disbursement')).toBe(
      LoanStatus.PENDING_DISBURSEMENT,
    );
    expect((service as any).normalizeLoanStatus('future_state')).toBe(
      LoanStatus.UNKNOWN,
    );
  });
});
