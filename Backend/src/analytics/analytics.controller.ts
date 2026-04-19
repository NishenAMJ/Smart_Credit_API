import { BadRequestException, Controller, DefaultValuePipe, Get, Query } from '@nestjs/common';
import {
  AnalyticsDrilldownResponse,
  AnalyticsOverviewResponse,
} from './analytics.types';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview(
    @Query('lenderId') lenderId?: string,
    @Query('range', new DefaultValuePipe('90d')) range?: string,
  ): Promise<AnalyticsOverviewResponse> {
    if (!lenderId || lenderId.trim().length === 0) {
      throw new BadRequestException('lenderId is required.');
    }

    return this.analyticsService.getOverview(lenderId, range);
  }

  @Get('drilldown')
  getDrilldown(
    @Query('lenderId') lenderId?: string,
    @Query('type') type?: string,
    @Query('range', new DefaultValuePipe('90d')) range?: string,
  ): Promise<AnalyticsDrilldownResponse> {
    if (!lenderId || lenderId.trim().length === 0) {
      throw new BadRequestException('lenderId is required.');
    }

    if (!type || type.trim().length === 0) {
      throw new BadRequestException('type is required.');
    }

    return this.analyticsService.getDrilldown(lenderId, type, range);
  }
}
