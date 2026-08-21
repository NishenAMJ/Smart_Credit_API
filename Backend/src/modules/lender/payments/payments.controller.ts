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
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PaymentsResponse } from './payments.types';
import type {
  LoanLedgerDetailsResponse,
  PaymentActivityFilter,
  RecordInstallmentPaymentInput,
  ReceiptVerificationDecisionInput,
} from './payments.types';
import { InstallmentPaymentService } from './installment-payment.service';
import { PaymentLedgerDetailsService } from './payment-ledger-details.service';
import { PaymentsService } from './payments.service';
import { PaymentsExportService } from './payments-export.service';
import { ReceiptVerificationService } from './receipt-verification.service';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('lender')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly installmentPaymentService: InstallmentPaymentService,
    private readonly ledgerDetailsService: PaymentLedgerDetailsService,
    private readonly paymentsExportService: PaymentsExportService,
    private readonly receiptVerificationService: ReceiptVerificationService,
  ) {}

  @Get('receipt-submissions')
  getReceiptSubmissions(@Req() req: AuthenticatedRequest) {
    return this.receiptVerificationService.listPending(req.user.sub);
  }

  @Post('receipt-submissions/:transactionId/decision')
  decideReceiptSubmission(
    @Req() req: AuthenticatedRequest,
    @Param('transactionId') transactionId: string,
    @Body() body: ReceiptVerificationDecisionInput,
  ) {
    return this.receiptVerificationService.decide(
      req.user.sub,
      transactionId,
      body,
    );
  }

  @Get()
  getPayments(
    @Req() req: AuthenticatedRequest,
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('includeSummary') includeSummary?: string,
    @Query('includeSearchCount') includeSearchCount?: string,
    @Query('search') search?: string,
    @Query('date') date?: string,
    @Query('activity') activity?: string,
  ): Promise<PaymentsResponse> {
    return this.paymentsService.getPayments(
      req.user.sub,
      this.toNumber(pageSize) ?? this.toNumber(limit) ?? 30,
      cursor?.trim() || null,
      includeSummary !== 'false',
      includeSearchCount !== 'false',
      search?.trim() || null,
      date?.trim() || null,
      this.toActivityFilter(activity),
    );
  }

  private toActivityFilter(value?: string): PaymentActivityFilter {
    const normalized = value?.trim().toLowerCase() || 'all';
    if (
      normalized !== 'all' &&
      normalized !== 'payment' &&
      normalized !== 'disbursement'
    ) {
      throw new BadRequestException(
        'activity must be all, payment, or disbursement.',
      );
    }
    return normalized;
  }

  @Get('export')
  async exportPayments(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<string> {
    const result = await this.paymentsExportService.createCsv(
      req.user.sub,
      startDate?.trim() || null,
      endDate?.trim() || null,
    );

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.fileName}"`,
    );
    response.setHeader('X-Export-Record-Count', String(result.recordCount));
    return result.csv;
  }

  @Get('loans/:loanId')
  async getLoanLedgerDetails(
    @Req() req: AuthenticatedRequest,
    @Param('loanId') loanId: string,
  ): Promise<LoanLedgerDetailsResponse> {
    const details = await this.ledgerDetailsService.get(req.user.sub, loanId);

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

    const details = await this.installmentPaymentService.record(
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
