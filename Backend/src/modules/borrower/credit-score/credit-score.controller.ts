import { Controller, Get, Post, Query } from '@nestjs/common';
import { resolveBorrowerId } from '../borrower-request.utils';
import { CreditScoreService } from './credit-score.service';

@Controller('borrower/credit-score')
export class CreditScoreController {
  constructor(private readonly creditScoreService: CreditScoreService) {}

  @Get()
  async getCreditScore(@Query('borrowerId') borrowerId?: string) {
    return {
      success: true,
      data: await this.creditScoreService.getSummary(
        resolveBorrowerId(borrowerId),
      ),
    };
  }

  @Get('history')
  async getCreditScoreHistory(@Query('borrowerId') borrowerId?: string) {
    return {
      success: true,
      data: await this.creditScoreService.getScoreHistory(
        resolveBorrowerId(borrowerId),
      ),
    };
  }

  @Post('recalculate')
  async recalculateCreditScore(@Query('borrowerId') borrowerId?: string) {
    const score = await this.creditScoreService.calculateCreditScore(
      resolveBorrowerId(borrowerId),
    );

    return {
      success: true,
      data: {
        score,
        rating: this.creditScoreService.getScoreRating(score),
        message: 'Credit score recalculated successfully.',
      },
    };
  }
}
