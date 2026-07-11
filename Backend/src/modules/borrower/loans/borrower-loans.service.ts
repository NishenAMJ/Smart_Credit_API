import { Injectable } from '@nestjs/common';
import {
  BORROWER_FILTER_LIMITS,
  BORROWER_FLOW,
} from '../shared/borrower.constants';
import { LoanStatus } from '../types/borrower.types';
import { BorrowerService } from '../core/borrower.service';

@Injectable()
export class BorrowerLoansService {
  constructor(private readonly borrowerService: BorrowerService) {}

  async getFeaturedLoans() {
    const ads = await this.borrowerService.getActiveLoanAds();
    return ads.slice(0, BORROWER_FLOW.FEATURED_LOAN_LIMIT);
  }

  async searchLoans(keyword = '') {
    const ads = await this.borrowerService.getActiveLoanAds();
    const normalized = keyword.trim().toLowerCase();

    if (normalized.length === 0) {
      return ads;
    }

    return ads.filter((loan) => {
      const nameMatch = String(loan.lenderName ?? '')
        .toLowerCase()
        .includes(normalized);
      const locationMatch = String(loan.lenderLocation ?? '')
        .toLowerCase()
        .includes(normalized);
      const purposeMatch = String(loan.purpose ?? '')
        .toLowerCase()
        .includes(normalized);

      return nameMatch || locationMatch || purposeMatch;
    });
  }

  getLoans(borrowerId: string, status?: LoanStatus) {
    return this.borrowerService.getLoans(borrowerId, status);
  }

  getLoanById(loanId: string, borrowerId: string) {
    return this.borrowerService.getLoanById(loanId, borrowerId);
  }

  async filterLoans(borrowerId: string, filters: Record<string, unknown>) {
    const loans = await this.borrowerService.getLoans(borrowerId);
    const minAmount = Number(
      filters.minAmount ?? BORROWER_FILTER_LIMITS.MIN_AMOUNT,
    );
    const maxAmount = Number(
      filters.maxAmount ?? BORROWER_FILTER_LIMITS.MAX_AMOUNT,
    );
    const status = String(filters.status ?? '').toLowerCase();

    return loans.filter((loan) => {
      const amountMatch =
        loan.principalAmount >= minAmount && loan.principalAmount <= maxAmount;
      const statusMatch = status ? loan.status === status : true;

      return amountMatch && statusMatch;
    });
  }
}

