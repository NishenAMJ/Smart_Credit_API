import { BadRequestException, Controller, DefaultValuePipe, Get, Query } from '@nestjs/common';
import {
  AnalyticsDrilldownResponse,
  AnalyticsOverviewResponse,
  AnalyticsSummaryResponse,
} from './analytics.types';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  getSummary(
    @Query('lenderId') lenderId?: string,
    @Query('range', new DefaultValuePipe('90d')) range?: string,
  ): Promise<AnalyticsSummaryResponse> {
    if (!lenderId || lenderId.trim().length === 0) {
      throw new BadRequestException('lenderId is required.');
    }

    return this.analyticsService.getSummary(lenderId, range);
  }

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
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ): Promise<AnalyticsDrilldownResponse> {
    if (!lenderId || lenderId.trim().length === 0) {
      throw new BadRequestException('lenderId is required.');
    }

    if (!type || type.trim().length === 0) {
      throw new BadRequestException('type is required.');
    }

    return this.analyticsService.getDrilldown(
      lenderId,
      type,
      range,
      this.toNumber(pageSize) ?? this.toNumber(limit) ?? 30,
      cursor?.trim() || null,
    );
  }

  private toNumber(value: string | undefined): number | null {
    if (!value) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
