import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardOverviewResponse } from './dashboard.types';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview(
    @Query('limit', new DefaultValuePipe(24), ParseIntPipe) limit: number,
  ): Promise<DashboardOverviewResponse> {
    return this.dashboardService.getOverview(limit);
  }
}
