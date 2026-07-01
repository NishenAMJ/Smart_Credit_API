import { BorrowerSupportService } from './borrower-support.service';

describe('BorrowerSupportService', () => {
  it('should return placeholder support status rows', () => {
    const service = new BorrowerSupportService();

    const result = service.getSupportStatus('borrower-1');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ title: 'Open Ticket' });
    expect(result[1]).toMatchObject({ title: 'Expected Reply' });
  });
});

