import { Injectable } from '@nestjs/common';

import { LoanRequestsService } from '../lender/loan-requests/loan-requests.service';

@Injectable()
export class LenderRequestsService {
  constructor(private readonly loanRequestsService: LoanRequestsService) {}

  approveRequest(lenderId: string, requestId: string, notes?: string) {
    return this.loanRequestsService.decideRequest(
      lenderId,
      requestId,
      'approve',
      notes,
    );
  }

  rejectRequest(lenderId: string, requestId: string, reason: string) {
    return this.loanRequestsService.decideRequest(
      lenderId,
      requestId,
      'reject',
      reason,
    );
  }
}
