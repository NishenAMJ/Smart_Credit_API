import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Query,
  Patch,
} from '@nestjs/common';
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';

@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  // POST /api/loans
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createLoan(@Body() createLoanDto: CreateLoanDto) {
    return this.loansService.createLoan(createLoanDto);
  }

  // GET /api/loans
  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllLoans() {
    return this.loansService.getAllLoans();
  }

  // GET /api/loans/statistics
  @Get('statistics')
  @HttpCode(HttpStatus.OK)
  async getLoanStatistics() {
    return this.loansService.getLoanStatistics();
  }

  // GET /api/loans/borrower/:borrowerId
  @Get('borrower/:borrowerId')
  @HttpCode(HttpStatus.OK)
  async getLoansByBorrowerId(@Param('borrowerId') borrowerId: string) {
    return this.loansService.getLoansByBorrowerId(borrowerId);
  }

  // GET /api/loans/lender/:lenderId
  @Get('lender/:lenderId')
  @HttpCode(HttpStatus.OK)
  async getLoansByLenderId(@Param('lenderId') lenderId: string) {
    return this.loansService.getLoansByLenderId(lenderId);
  }

  // GET /api/loans/:loanId
  @Get(':loanId')
  @HttpCode(HttpStatus.OK)
  async getLoanById(@Param('loanId') loanId: string) {
    return this.loansService.getLoanById(loanId);
  }

  // GET /api/loans/:loanId/check-default
  @Get(':loanId/check-default')
  @HttpCode(HttpStatus.OK)
  async checkDefaultStatus(@Param('loanId') loanId: string) {
    const isDefault = await this.loansService.checkDefaultStatus(loanId);
    return {
      statusCode: 200,
      message: 'Default status checked',
      data: { loanId, isDefault },
    };
  }

  // PUT /api/loans/:loanId
  @Put(':loanId')
  @HttpCode(HttpStatus.OK)
  async updateLoan(
    @Param('loanId') loanId: string,
    @Body() updateLoanDto: UpdateLoanDto,
  ) {
    return this.loansService.updateLoan(loanId, updateLoanDto);
  }

  // PATCH /api/loans/:loanId/balance
  @Patch(':loanId/balance')
  @HttpCode(HttpStatus.OK)
  async updateBalance(
    @Param('loanId') loanId: string,
    @Body('amountPaid') amountPaid: number,
  ) {
    return this.loansService.updateBalance(loanId, amountPaid);
  }

  // PATCH /api/loans/:loanId/close
  @Patch(':loanId/close')
  @HttpCode(HttpStatus.OK)
  async closeLoan(@Param('loanId') loanId: string) {
    return this.loansService.closeLoan(loanId);
  }

  // DELETE /api/loans/:loanId
  @Delete(':loanId')
  @HttpCode(HttpStatus.OK)
  async deleteLoan(@Param('loanId') loanId: string) {
    return this.loansService.deleteLoan(loanId);
  }
}
