import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RecentTransactionsResponse } from './recent-transactions.types';
import type {
  LoanLedgerDetailsResponse,
  RecordInstallmentPaymentInput,
} from './recent-transactions.types';
import { RecentTransactionsService } from './recent-transactions.service';

@Controller('recent-transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('lender')
export class RecentTransactionsController {
  constructor(
    private readonly recentTransactionsService: RecentTransactionsService,
  ) {}

  @Get()
  getRecentTransactions(
    @Req() req: AuthenticatedRequest,
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('includeSummary') includeSummary?: string,
    @Query('includeSearchCount') includeSearchCount?: string,
    @Query('search') search?: string,
  ): Promise<RecentTransactionsResponse> {
    return this.recentTransactionsService.getRecentTransactions(
      req.user.sub,
      this.toNumber(pageSize) ?? this.toNumber(limit) ?? 30,
      cursor?.trim() || null,
      includeSummary !== 'false',
      includeSearchCount !== 'false',
      search?.trim() || null,
    );
  }

  @Get('loans/:loanId')
  async getLoanLedgerDetails(
    @Req() req: AuthenticatedRequest,
    @Param('loanId') loanId: string,
  ): Promise<LoanLedgerDetailsResponse> {
    const details = await this.recentTransactionsService.getLoanLedgerDetails(
      req.user.sub,
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
    @Req() req: AuthenticatedRequest,
    @Param('loanId') loanId: string,
    @Param('installmentId') installmentId: string,
    @Body() body: RecordInstallmentPaymentInput,
  ): Promise<LoanLedgerDetailsResponse> {
    if (
      !body ||
      typeof body.amount !== 'number' ||
      !Number.isFinite(body.amount)
    ) {
      throw new BadRequestException('A valid payment amount is required.');
    }

    const details =
      await this.recentTransactionsService.recordInstallmentPayment(
        req.user.sub,
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
