import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { resolveBorrowerId } from '../shared/borrower-request.utils';
import { LoanStatus } from '../types/borrower.types';
import { BorrowerLoansService } from './borrower-loans.service';

@Controller('borrower/loans')
export class BorrowerLoansController {
  constructor(private readonly borrowerLoansService: BorrowerLoansService) {}

  @Get('featured')
  async getFeaturedLoans() {
    return {
      success: true,
      data: await this.borrowerLoansService.getFeaturedLoans(),
    };
  }

  @Get('search')
  async searchLoans(@Query('keyword') keyword = '') {
    return {
      success: true,
      data: await this.borrowerLoansService.searchLoans(keyword),
    };
  }

  @Get()
  async getMyLoans(
    @Query('borrowerId') borrowerId?: string,
    @Query('status') status?: LoanStatus,
  ) {
    return {
      success: true,
      data: await this.borrowerLoansService.getLoans(
        resolveBorrowerId(borrowerId),
        status,
      ),
    };
  }

  @Get(':loanId')
  async getLoanDetails(
    @Param('loanId') loanId: string,
    @Query('borrowerId') borrowerId?: string,
  ) {
    return {
      success: true,
      data: await this.borrowerLoansService.getLoanById(
        loanId,
        resolveBorrowerId(borrowerId),
      ),
    };
  }

  @Post('filter')
  async filterLoans(
    @Body() filters: Record<string, unknown>,
    @Query('borrowerId') borrowerId?: string,
  ) {
    return {
      success: true,
      data: await this.borrowerLoansService.filterLoans(
        resolveBorrowerId(borrowerId),
        filters,
      ),
    };
  }
}

