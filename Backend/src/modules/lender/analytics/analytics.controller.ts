import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import {
  AnalyticsDrilldownResponse,
  AnalyticsOverviewResponse,
  AnalyticsSummaryResponse,
} from './analytics.types';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('lender')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  getSummary(
    @Req() req: AuthenticatedRequest,
    @Query('range', new DefaultValuePipe('90d')) range?: string,
  ): Promise<AnalyticsSummaryResponse> {
    return this.analyticsService.getSummary(req.user.sub, range);
  }

  @Get('overview')
  getOverview(
    @Req() req: AuthenticatedRequest,
    @Query('range', new DefaultValuePipe('90d')) range?: string,
  ): Promise<AnalyticsOverviewResponse> {
    return this.analyticsService.getOverview(req.user.sub, range);
  }

  @Get('drilldown')
  getDrilldown(
    @Req() req: AuthenticatedRequest,
    @Query('type') type?: string,
    @Query('range', new DefaultValuePipe('90d')) range?: string,
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ): Promise<AnalyticsDrilldownResponse> {
    if (!type || type.trim().length === 0) {
      throw new BadRequestException('type is required.');
    }

    return this.analyticsService.getDrilldown(
      req.user.sub,
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
