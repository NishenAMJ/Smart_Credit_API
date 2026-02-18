import { Controller, Get, Param, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { LenderBorrowersService } from './lender_borrowers.service';
import type { Borrower, BorrowerHistory } from './lender_borrowers.service';

@Controller('api/lender/borrowers')
export class LenderBorrowersController {
  private readonly logger = new Logger(LenderBorrowersController.name);

  constructor(private readonly borrowersService: LenderBorrowersService) {}

  @Get(':borrowerId')
  async getBorrower(@Param('borrowerId') borrowerId: string) {
    try {
      this.logger.log(`Fetching borrower ${borrowerId}`);
      const borrower = await this.borrowersService.getBorrower(borrowerId);
      if (!borrower) throw new NotFoundException('Borrower not found');
      return { success: true, data: borrower };
    } catch (error) {
      this.logger.error('Error fetching borrower', error.stack);
      throw new InternalServerErrorException('Failed to fetch borrower');
    }
  }

  @Get(':borrowerId/credit-score')
  async getCreditScore(@Param('borrowerId') borrowerId: string) {
    try {
      this.logger.log(`Fetching credit score for borrower ${borrowerId}`);
      const score = await this.borrowersService.getCreditScore(borrowerId);
      if (score === null || score === undefined) throw new NotFoundException('Credit score not found');
      return { success: true, creditScore: score };
    } catch (error) {
      this.logger.error('Error fetching credit score', error.stack);
      throw new InternalServerErrorException('Failed to fetch credit score');
    }
  }

  @Get(':borrowerId/history')
  async getBorrowerHistory(@Param('borrowerId') borrowerId: string) {
    try {
      this.logger.log(`Fetching history for borrower ${borrowerId}`);
      const history = await this.borrowersService.getBorrowerHistory(borrowerId);
      if (!history) throw new NotFoundException('Borrower history not found');
      return { success: true, history };
    } catch (error) {
      this.logger.error('Error fetching borrower history', error.stack);
      throw new InternalServerErrorException('Failed to fetch borrower history');
    }
  }
}

//updated endpoint1 