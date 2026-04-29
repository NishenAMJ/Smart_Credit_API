import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { LoanRequestsService } from './loan-requests.service';
import { PendingRequestsResponse } from './loan-requests.types';

@Controller('loan-requests')
export class LoanRequestsController {
  constructor(private readonly loanRequestsService: LoanRequestsService) {}

  @Get('pending')
  getPendingRequests(
    @Query('lenderId') lenderId: string | undefined,
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('adId') adId?: string,
    @Query('includeSummary') includeSummary?: string,
    @Query('includeAllStatuses') includeAllStatuses?: string,
  ): Promise<PendingRequestsResponse> {
    if (!lenderId?.trim()) {
      throw new BadRequestException('lenderId is required.');
    }

    return this.loanRequestsService.getPendingRequests(
      lenderId.trim(),
      this.toNumber(pageSize) ?? this.toNumber(limit) ?? 30,
      cursor?.trim() || null,
      includeSummary !== 'false',
      adId?.trim() || null,
      includeAllStatuses === 'true',
    );
  }

  private toNumber(value: string | undefined): number | null {
    if (!value) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
