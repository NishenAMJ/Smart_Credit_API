import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { resolveBorrowerId } from '../shared/borrower-request.utils';
import { RepaymentMethod } from '../applications/dto/loan-application.dto';
import { BorrowerPaymentsService } from './borrower-payments.service';

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

  @Post('payments/generate-qr')
  async generateQr(
    @Body() payload: { loanId: string; amount?: number; borrowerId?: string },
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
  async verifyQr(@Body() payload: { token: string }) {
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
}
