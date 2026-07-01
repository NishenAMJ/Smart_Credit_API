import { BorrowerApplicationsService } from './borrower-applications.service';

describe('BorrowerApplicationsService', () => {
  it('should be defined', () => {
    const service = new BorrowerApplicationsService({} as any, {} as any);

    expect(service).toBeDefined();
  });
});

