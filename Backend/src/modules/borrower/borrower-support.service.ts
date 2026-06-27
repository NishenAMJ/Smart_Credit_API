import { Injectable } from '@nestjs/common';

/**
 * Provides borrower support ticket status data.
 * Currently returns mocked data — replace with a real tickets collection query when ready.
 */
@Injectable()
export class BorrowerSupportService {
  /**
   * Returns placeholder support ticket statuses for the borrower.
   * The _borrowerId param is reserved for a real Firestore query once tickets are implemented.
   */
  getSupportStatus(_borrowerId: string) {
    return [
      {
        id: `TCK-${Math.floor(Math.random() * 90000) + 10000}`,
        title: 'Open Ticket',
        value: `TCK-${Math.floor(Math.random() * 90000) + 10000}`,
        subtitle: 'In Progress - Payment verification',
        color: '#F59E0B',
      },
      {
        id: `RPL-${Math.floor(Math.random() * 90000) + 10000}`,
        title: 'Expected Reply',
        value: 'Within 2 hours',
        subtitle: 'Average first response time',
        color: '#0EA5E9',
      },
    ];
  }
}
