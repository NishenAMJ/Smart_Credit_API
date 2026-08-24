import { Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { resolveAuthenticatedBorrowerId } from '../shared/borrower-request.utils';
import { CreditScoreService } from './credit-score.service';

@Controller('borrower/credit-score')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('borrower')
export class CreditScoreController {
  constructor(private readonly creditScoreService: CreditScoreService) {}

  @Get()
  async getCreditScore(
    @Req() req: AuthenticatedRequest,
    @Query('borrowerId') borrowerId?: string,
  ) {
    return {
      success: true,
      data: await this.creditScoreService.getSummary(
        resolveAuthenticatedBorrowerId(req.user.sub, borrowerId),
      ),
    };
  }

  @Get('history')
  async getCreditScoreHistory(
    @Req() req: AuthenticatedRequest,
    @Query('borrowerId') borrowerId?: string,
  ) {
    return {
      success: true,
      data: await this.creditScoreService.getScoreHistory(
        resolveAuthenticatedBorrowerId(req.user.sub, borrowerId),
      ),
    };
  }

  @Post('recalculate')
  async recalculateCreditScore(
    @Req() req: AuthenticatedRequest,
    @Query('borrowerId') borrowerId?: string,
  ) {
    const score = await this.creditScoreService.calculateCreditScore(
      resolveAuthenticatedBorrowerId(req.user.sub, borrowerId),
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
