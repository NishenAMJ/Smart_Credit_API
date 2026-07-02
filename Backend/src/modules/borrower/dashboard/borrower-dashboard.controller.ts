import { Controller, Get, Param } from '@nestjs/common';
import { BorrowerDashboardService } from './borrower-dashboard.service';

@Controller('borrower/dashboard')
export class BorrowerDashboardController {
  constructor(
    private readonly borrowerDashboardService: BorrowerDashboardService,
  ) {}

  @Get(':userId')
  async getDashboard(@Param('userId') userId: string) {
    return {
      success: true,
      data: await this.borrowerDashboardService.getDashboard(userId),
    };
  }
}

