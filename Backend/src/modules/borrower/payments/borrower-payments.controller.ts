import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { resolveBorrowerId } from '../shared/borrower-request.utils';
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
  async getMyPayments(@Query('borrowerId') borrowerId?: string) {
    return {
      success: true,
      data: await this.borrowerPaymentsService.getPayments(
        resolveBorrowerId(borrowerId),
      ),
    };
  }

  @Post('payments')
  async createPayment(
    @Body()
    payload: {
      loanId: string;
      amount?: number;
      paymentMethod?: RepaymentMethod;
      transactionReference?: string;
      paymentProofUrl?: string;
      borrowerId?: string;
    },
    @Query('borrowerId') borrowerId?: string,
  ) {
    return {
      success: true,
      data: await this.borrowerPaymentsService.makePayment({
        ...payload,
        borrowerId: resolveBorrowerId(payload.borrowerId ?? borrowerId),
      }),
    };
  }

  @Post('payments/payhere/initiate')
  async initiatePayHerePayment(
    @Body()
    payload: {
      loanId: string;
      amount: number;
      borrowerId?: string;
    },
    @Req() request: Request,
    @Query('borrowerId') borrowerId?: string,
  ) {
    return {
      success: true,
      data: await this.borrowerPaymentsService.initiatePayHerePayment({
        loanId: payload.loanId,
        amount: Number(payload.amount),
        borrowerId: resolveBorrowerId(payload.borrowerId ?? borrowerId),
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
  async generateQr(
    @Body() payload: GenerateQrDto,
    @Query('borrowerId') borrowerId?: string,
  ) {
    return {
      success: true,
      data: await this.borrowerPaymentsService.generateQrToken(
        payload.loanId,
        resolveBorrowerId(payload.borrowerId ?? borrowerId),
        payload.amount,
      ),
    };
  }

  @Post('payments/verify-qr')
  async verifyQr(@Body() payload: VerifyQrDto) {
    return {
      success: true,
      data: await this.borrowerPaymentsService.verifyQrToken(payload.token),
    };
  }

  @Post('payments/upload-receipt')
  uploadReceipt(@Body() payload: Record<string, unknown>) {
    return {
      success: true,
      data: this.borrowerPaymentsService.uploadReceipt(payload),
    };
  }

  @Get('transactions')
  async getMyTransactions(@Query('borrowerId') borrowerId?: string) {
    return {
      success: true,
      data: await this.borrowerPaymentsService.getTransactions(
        resolveBorrowerId(borrowerId),
      ),
    };
  }

  @Get('transactions/:transactionId')
  async getTransactionDetails(
    @Param('transactionId') transactionId: string,
    @Query('borrowerId') borrowerId?: string,
  ) {
    return {
      success: true,
      data: await this.borrowerPaymentsService.getTransactionById(
        resolveBorrowerId(borrowerId),
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
