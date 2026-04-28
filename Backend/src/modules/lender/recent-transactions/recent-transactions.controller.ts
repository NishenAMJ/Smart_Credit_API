import {
  Body,
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { RecentTransactionsResponse } from './recent-transactions.types';
import type {
  LoanLedgerDetailsResponse,
  RecordInstallmentPaymentInput,
} from './recent-transactions.types';
import { RecentTransactionsService } from './recent-transactions.service';

@Controller('recent-transactions')
export class RecentTransactionsController {
  constructor(
    private readonly recentTransactionsService: RecentTransactionsService,
  ) {}

  @Get()
  getRecentTransactions(
    @Query('lenderId') lenderId: string,
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('includeSummary') includeSummary?: string,
    @Query('search') search?: string,
  ): Promise<RecentTransactionsResponse> {
    const normalizedLenderId = lenderId?.trim();

    if (!normalizedLenderId) {
      throw new BadRequestException('lenderId is required.');
    }

    return this.recentTransactionsService.getRecentTransactions(
      normalizedLenderId,
      this.toNumber(pageSize) ?? this.toNumber(limit) ?? 30,
      cursor?.trim() || null,
      includeSummary !== 'false',
      search?.trim() || null,
    );
  }

  @Get('loans/:loanId')
  async getLoanLedgerDetails(
    @Param('loanId') loanId: string,
    @Query('lenderId') lenderId: string,
  ): Promise<LoanLedgerDetailsResponse> {
    const normalizedLenderId = lenderId?.trim();

    if (!normalizedLenderId) {
      throw new BadRequestException('lenderId is required.');
    }

    const details = await this.recentTransactionsService.getLoanLedgerDetails(
      normalizedLenderId,
      loanId,
    );

    if (!details) {
      throw new NotFoundException(
        `Loan ${loanId} was not found for this lender.`,
      );
    }

    return details;
  }

  @Post('loans/:loanId/installments/:installmentId/payments')
  async recordInstallmentPayment(
    @Param('loanId') loanId: string,
    @Param('installmentId') installmentId: string,
    @Query('lenderId') lenderId: string,
    @Body() body: RecordInstallmentPaymentInput,
  ): Promise<LoanLedgerDetailsResponse> {
    const normalizedLenderId = lenderId?.trim();

    if (!normalizedLenderId) {
      throw new BadRequestException('lenderId is required.');
    }

    if (
      !body ||
      typeof body.amount !== 'number' ||
      !Number.isFinite(body.amount)
    ) {
      throw new BadRequestException('A valid payment amount is required.');
    }

    const details =
      await this.recentTransactionsService.recordInstallmentPayment(
        normalizedLenderId,
        loanId,
        installmentId,
        body,
      );

    if (!details) {
      throw new NotFoundException(
        `Loan ${loanId} or installment ${installmentId} was not found for this lender.`,
      );
    }

    return details;
  }

  private toNumber(value: string | undefined): number | null {
    if (!value) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
