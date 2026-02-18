// modules/borrower/borrower.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BorrowerService } from './borrower.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { FilterLoansDto } from './dto/filter-loans.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UploadReceiptDto } from './dto/upload-receipt.dto';
import { GenerateQrDto } from './dto/generate-qr.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('borrower')
export class BorrowerController {
  constructor(private readonly borrowerService: BorrowerService) {}

  // ==================== LOAN DISCOVERY ====================

  // GET /api/borrower/loans/search?keyword=medical
  @Get('loans/search')
  @HttpCode(HttpStatus.OK)
  async searchLoans(@Query('keyword') keyword: string) {
    return this.borrowerService.searchLoans(keyword);
  }

  // GET /api/borrower/loans/featured
  @Get('loans/featured')
  @HttpCode(HttpStatus.OK)
  async getFeaturedLoans() {
    return this.borrowerService.getFeaturedLoans();
  }

  // GET /api/borrower/loans/:loanId
  @Get('loans/:loanId')
  @HttpCode(HttpStatus.OK)
  async getLoanById(@Param('loanId') loanId: string) {
    return this.borrowerService.getLoanById(loanId);
  }

  // POST /api/borrower/loans/filter
  @Post('loans/filter')
  @HttpCode(HttpStatus.OK)
  async filterLoans(@Body() filterDto: FilterLoansDto) {
    return this.borrowerService.filterLoans(filterDto);
  }

  // ==================== LOAN APPLICATION ====================

  // GET /api/borrower/applications
  @Get('applications')
  @HttpCode(HttpStatus.OK)
  async getAllApplications(@Query('borrowerId') borrowerId?: string) {
    return this.borrowerService.getAllApplications(borrowerId);
  }

  // GET /api/borrower/applications/:applicationId
  @Get('applications/:applicationId')
  @HttpCode(HttpStatus.OK)
  async getApplicationById(@Param('applicationId') applicationId: string) {
    return this.borrowerService.getApplicationById(applicationId);
  }

  // POST /api/borrower/applications
  @Post('applications')
  @HttpCode(HttpStatus.CREATED)
  async createApplication(@Body() createApplicationDto: CreateApplicationDto) {
    return this.borrowerService.createApplication(createApplicationDto);
  }

  // PUT /api/borrower/applications/:applicationId
  @Put('applications/:applicationId')
  @HttpCode(HttpStatus.OK)
  async updateApplication(
    @Param('applicationId') applicationId: string,
    @Body() updateApplicationDto: UpdateApplicationDto,
  ) {
    return this.borrowerService.updateApplication(
      applicationId,
      updateApplicationDto,
    );
  }

  // DELETE /api/borrower/applications/:applicationId
  @Delete('applications/:applicationId')
  @HttpCode(HttpStatus.OK)
  async deleteApplication(@Param('applicationId') applicationId: string) {
    return this.borrowerService.deleteApplication(applicationId);
  }

  // ==================== CREDIT SCORE ====================

  // GET /api/borrower/credit-score?borrowerId=xxx
  @Get('credit-score')
  @HttpCode(HttpStatus.OK)
  async getCreditScore(@Query('borrowerId') borrowerId: string) {
    return this.borrowerService.getCreditScore(borrowerId);
  }

  // GET /api/borrower/credit-score/history?borrowerId=xxx
  @Get('credit-score/history')
  @HttpCode(HttpStatus.OK)
  async getCreditScoreHistory(@Query('borrowerId') borrowerId: string) {
    return this.borrowerService.getCreditScoreHistory(borrowerId);
  }

  // GET /api/borrower/credit-score/factors?borrowerId=xxx
  @Get('credit-score/factors')
  @HttpCode(HttpStatus.OK)
  async getCreditScoreFactors(@Query('borrowerId') borrowerId: string) {
    return this.borrowerService.getCreditScoreFactors(borrowerId);
  }

  // ==================== REPAYMENT ====================

  // GET /api/borrower/payments?borrowerId=xxx
  @Get('payments')
  @HttpCode(HttpStatus.OK)
  async getAllPayments(@Query('borrowerId') borrowerId?: string) {
    return this.borrowerService.getAllPayments(borrowerId);
  }

  // GET /api/borrower/payments/:paymentId
  @Get('payments/:paymentId')
  @HttpCode(HttpStatus.OK)
  async getPaymentById(@Param('paymentId') paymentId: string) {
    return this.borrowerService.getPaymentById(paymentId);
  }

  // POST /api/borrower/payments
  @Post('payments')
  @HttpCode(HttpStatus.CREATED)
  async createPayment(@Body() createPaymentDto: CreatePaymentDto) {
    return this.borrowerService.createPayment(createPaymentDto);
  }

  // POST /api/borrower/payments/qr-generate
  @Post('payments/qr-generate')
  @HttpCode(HttpStatus.OK)
  async generateQrCode(@Body() generateQrDto: GenerateQrDto) {
    return this.borrowerService.generateQrCode(generateQrDto);
  }

  // POST /api/borrower/payments/upload-receipt
  @Post('payments/upload-receipt')
  @HttpCode(HttpStatus.OK)
  async uploadReceipt(@Body() uploadReceiptDto: UploadReceiptDto) {
    return this.borrowerService.uploadReceipt(uploadReceiptDto);
  }

  // ==================== TRANSACTION HISTORY ====================

  // GET /api/borrower/transactions?borrowerId=xxx
  @Get('transactions')
  @HttpCode(HttpStatus.OK)
  async getAllTransactions(@Query('borrowerId') borrowerId?: string) {
    return this.borrowerService.getAllTransactions(borrowerId);
  }

  // GET /api/borrower/transactions/:transactionId
  @Get('transactions/:transactionId')
  @HttpCode(HttpStatus.OK)
  async getTransactionById(@Param('transactionId') transactionId: string) {
    return this.borrowerService.getTransactionById(transactionId);
  }

  // GET /api/borrower/payment-schedule/:loanId
  @Get('payment-schedule/:loanId')
  @HttpCode(HttpStatus.OK)
  async getPaymentSchedule(@Param('loanId') loanId: string) {
    return this.borrowerService.getPaymentSchedule(loanId);
  }

  // ==================== CHAT & COMMUNICATION ====================

  // GET /api/borrower/chat/conversations?borrowerId=xxx
  @Get('chat/conversations')
  @HttpCode(HttpStatus.OK)
  async getAllConversations(@Query('borrowerId') borrowerId: string) {
    return this.borrowerService.getAllConversations(borrowerId);
  }

  // GET /api/borrower/chat/:conversationId
  @Get('chat/:conversationId')
  @HttpCode(HttpStatus.OK)
  async getConversationMessages(
    @Param('conversationId') conversationId: string,
  ) {
    return this.borrowerService.getConversationMessages(conversationId);
  }

  // POST /api/borrower/chat/send
  @Post('chat/send')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(@Body() sendMessageDto: SendMessageDto) {
    return this.borrowerService.sendMessage(sendMessageDto);
  }

  // ==================== NOTIFICATIONS ====================

  // GET /api/borrower/notifications?borrowerId=xxx
  @Get('notifications')
  @HttpCode(HttpStatus.OK)
  async getAllNotifications(@Query('borrowerId') borrowerId: string) {
    return this.borrowerService.getAllNotifications(borrowerId);
  }

  // PUT /api/borrower/notifications/:notificationId/read
  @Put('notifications/:notificationId/read')
  @HttpCode(HttpStatus.OK)
  async markNotificationAsRead(
    @Param('notificationId') notificationId: string,
  ) {
    return this.borrowerService.markNotificationAsRead(notificationId);
  }

  // DELETE /api/borrower/notifications/:notificationId
  @Delete('notifications/:notificationId')
  @HttpCode(HttpStatus.OK)
  async deleteNotification(@Param('notificationId') notificationId: string) {
    return this.borrowerService.deleteNotification(notificationId);
  }
}
