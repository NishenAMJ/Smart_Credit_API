import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { LoanRequestsService } from './loan-requests.service';
import { PendingRequestsResponse } from './loan-requests.types';

@Controller('loan-requests')
export class LoanRequestsController {
  constructor(private readonly loanRequestsService: LoanRequestsService) {}

  @Get('pending')
  getPendingRequests(
    @Query('lenderId') lenderId: string | undefined,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
  ): Promise<PendingRequestsResponse> {
    if (!lenderId?.trim()) {
      throw new BadRequestException('lenderId is required.');
    }

    return this.loanRequestsService.getPendingRequests(lenderId.trim(), limit);
  }
}
