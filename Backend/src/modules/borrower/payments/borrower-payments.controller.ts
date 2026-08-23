import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { resolveAuthenticatedBorrowerId } from '../shared/borrower-request.utils';
import { RepaymentMethod } from '../applications/dto/loan-application.dto';
import { BorrowerPaymentsService } from './borrower-payments.service';
import { GenerateQrDto } from './dto/generate-qr.dto';
import { VerifyQrDto } from './dto/verify-qr.dto';

@Controller('borrower')
export class BorrowerPaymentsController {
  constructor(
    private readonly borrowerPaymentsService: BorrowerPaymentsService,
  ) {}

  @Get('payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('borrower')
  async getMyPayments(
    @Req() req: AuthenticatedRequest,
    @Query('borrowerId') borrowerId?: string,
  ) {
    return {
      success: true,
      data: await this.borrowerPaymentsService.getPayments(
        resolveAuthenticatedBorrowerId(req.user.sub, borrowerId),
      ),
    };
  }

  @Post('payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('borrower')
  async createPayment(
    @Req() req: AuthenticatedRequest,
    @Body()
    payload: {
      loanId: string;
      amount?: number;
      paymentMethod?: RepaymentMethod;
      transactionReference?: string;
      paymentProofUrl?: string;
      receiptDocumentId?: string;
      borrowerId?: string;
    },
    @Query('borrowerId') borrowerId?: string,
  ) {
    return {
      success: true,
      data: await this.borrowerPaymentsService.makePayment({
        ...payload,
        borrowerId: resolveAuthenticatedBorrowerId(
          req.user.sub,
          payload.borrowerId ?? borrowerId,
        ),
      }),
    };
  }

  @Post('payments/payhere/initiate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('borrower')
  async initiatePayHerePayment(
    @Body()
    payload: {
      loanId: string;
      amount: number;
      borrowerId?: string;
    },
    @Req() request: AuthenticatedRequest,
    @Query('borrowerId') borrowerId?: string,
  ) {
    return {
      success: true,
      data: await this.borrowerPaymentsService.initiatePayHerePayment({
        loanId: payload.loanId,
        amount: Number(payload.amount),
        borrowerId: resolveAuthenticatedBorrowerId(
          request.user.sub,
          payload.borrowerId ?? borrowerId,
        ),
        requestBaseUrl: this.getRequestBaseUrl(request),
      }),
    };
  }

  @Get('payments/payhere/checkout/:orderId')
  @Header('Content-Type', 'text/html')
  async renderPayHereCheckout(@Param('orderId') orderId: string) {
    return this.borrowerPaymentsService.renderPayHereCheckout(orderId);
  }

  @Get('payments/payhere/result/:status')
  @Header('Content-Type', 'text/html')
  renderPayHereResult(@Param('status') status: string) {
    return this.borrowerPaymentsService.renderPayHereResult(
      status === 'success' ? 'success' : 'cancelled',
    );
  }

  @Post('payments/payhere/notify')
  async handlePayHereNotification(@Body() payload: Record<string, string>) {
    return this.borrowerPaymentsService.handlePayHereNotification(payload);
  }

  @Post('payments/generate-qr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('borrower')
  async generateQr(
    @Req() req: AuthenticatedRequest,
    @Body() payload: GenerateQrDto,
    @Query('borrowerId') borrowerId?: string,
  ) {
    return {
      success: true,
      data: await this.borrowerPaymentsService.generateQrToken(
        payload.loanId,
        resolveAuthenticatedBorrowerId(
          req.user.sub,
          payload.borrowerId ?? borrowerId,
        ),
        payload.amount,
      ),
    };
  }

  @Post('payments/verify-qr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('borrower', 'lender')
  async verifyQr(@Body() payload: VerifyQrDto) {
    return {
      success: true,
      data: await this.borrowerPaymentsService.verifyQrToken(payload.token),
    };
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('borrower')
  async getMyTransactions(
    @Req() req: AuthenticatedRequest,
    @Query('borrowerId') borrowerId?: string,
  ) {
    return {
      success: true,
      data: await this.borrowerPaymentsService.getTransactions(
        resolveAuthenticatedBorrowerId(req.user.sub, borrowerId),
      ),
    };
  }

  @Get('transactions/:transactionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('borrower')
  async getTransactionDetails(
    @Req() req: AuthenticatedRequest,
    @Param('transactionId') transactionId: string,
    @Query('borrowerId') borrowerId?: string,
  ) {
    return {
      success: true,
      data: await this.borrowerPaymentsService.getTransactionById(
        resolveAuthenticatedBorrowerId(req.user.sub, borrowerId),
        transactionId,
      ),
    };
  }

  private getRequestBaseUrl(request: Request) {
    const forwardedProto = request.get('x-forwarded-proto');
    const forwardedHost = request.get('x-forwarded-host');
    const proto = forwardedProto?.split(',')[0]?.trim() || request.protocol;
    const host = forwardedHost?.split(',')[0]?.trim() || request.get('host');

    return `${proto}://${host}`;
  }
}
