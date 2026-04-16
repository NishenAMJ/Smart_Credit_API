import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { DashboardService, Borrower } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  async getDashboardMetrics() {
    return this.dashboardService.getDashboardMetrics();
  }

  @Get('recent-borrowers')
  async getRecentBorrowers(
    @Query('limit') limit?: string,
  ): Promise<Borrower[]> {
    const lim = limit ? parseInt(limit, 10) : 50;
    return this.dashboardService.getRecentBorrowers(lim);
  }

  // Keep your previous endpoint if you still need it
  @Get('user/:uid')
  async getUserProfile(@Param('uid') uid: string) {
    // ... your existing code
  }
}

/*
// Example: GET http://localhost:3000/dashboard/user/abc123...
  @Get('user/:uid')
  async getUserProfile(@Param('uid') uid: string) {
    try {
      return await this.dashboardService.getUserProfile(uid);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
*/
