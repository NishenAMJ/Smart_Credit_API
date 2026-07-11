import { BorrowerDashboardService } from './borrower-dashboard.service';

describe('BorrowerDashboardService', () => {
  it('should be defined', () => {
    const service = new BorrowerDashboardService({} as any);

    expect(service).toBeDefined();
  });
});

