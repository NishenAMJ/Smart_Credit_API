import { Injectable, Logger } from '@nestjs/common';

export interface Borrower {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface BorrowerHistory {
  loans: { amount: number; date: string; status: string }[];
  payments: { amount: number; date: string }[];
}

@Injectable()
export class LenderBorrowersService {
  private readonly logger = new Logger(LenderBorrowersService.name);

  private borrowers: Borrower[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', phone: '1234567890' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', phone: '0987654321' },
  ];

  private creditScores: Record<string, number> = {
    '1': 720,
    '2': 650,
  };

  private histories: Record<string, BorrowerHistory> = {
    '1': {
      loans: [
        { amount: 1000, date: '2025-01-01', status: 'paid' },
        { amount: 2000, date: '2025-06-01', status: 'active' },
      ],
      payments: [
        { amount: 1000, date: '2025-02-01' },
        { amount: 500, date: '2025-07-01' },
      ],
    },
    '2': {
      loans: [
        { amount: 1500, date: '2025-03-01', status: 'paid' },
      ],
      payments: [
        { amount: 1500, date: '2025-04-01' },
      ],
    },
  };

  async getBorrower(borrowerId: string): Promise<Borrower | undefined> {
    this.logger.debug(`Looking up borrower ${borrowerId}`);
    return this.borrowers.find(b => b.id === borrowerId);
  }

  async getCreditScore(borrowerId: string): Promise<number | null> {
    this.logger.debug(`Looking up credit score for ${borrowerId}`);
    return this.creditScores[borrowerId] ?? null;
  }

  async getBorrowerHistory(borrowerId: string): Promise<BorrowerHistory | undefined> {
    this.logger.debug(`Looking up history for ${borrowerId}`);
    return this.histories[borrowerId];
  }
}

// This service provides methods to retrieve borrower information, credit scores, and borrowing history. In a real application, these would likely involve database queries or calls to external services. Here, we use in-memory data for demonstration purposes.