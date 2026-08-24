import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import {
  CreateLenderAdInput,
  LenderAdAnalyticsResponse,
  LenderAdResponse,
  LenderAdsListResponse,
} from './lender-ads.types';
import { CreateLenderAdDto, UpdateLenderAdDto } from './lender-ads.dto';
import { LenderAdsService } from './lender-ads.service';
import { LenderAdAnalyticsService } from './lender-ad-analytics.service';

@Controller('lender-ads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('lender')
export class LenderAdsController {
  constructor(
    private readonly lenderAdsService: LenderAdsService,
    private readonly analyticsService: LenderAdAnalyticsService,
  ) {}

  @Post()
  createAd(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateLenderAdDto,
  ): Promise<LenderAdResponse> {
    return this.lenderAdsService.createAd(request.user.sub, body);
  }

  @Get()
  getAdsForLender(
    @Req() request: AuthenticatedRequest,
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('status') status?: string,
  ): Promise<LenderAdsListResponse> {
    return this.lenderAdsService.getAdsForLender(
      request.user.sub,
      this.toOptionalNumber(pageSize) ?? this.toOptionalNumber(limit) ?? 6,
      cursor?.trim() || null,
      status?.trim() || null,
    );
  }

  @Get(':adId/analytics')
  getAdAnalytics(
    @Req() request: AuthenticatedRequest,
    @Param('adId') adId: string,
  ): Promise<LenderAdAnalyticsResponse> {
    return this.analyticsService.getAdAnalytics(request.user.sub, adId);
  }

  @Patch(':adId')
  updateAd(
    @Req() request: AuthenticatedRequest,
    @Param('adId') adId: string,
    @Body() body: UpdateLenderAdDto,
  ): Promise<LenderAdResponse> {
    return this.lenderAdsService.updateAd(request.user.sub, adId, body);
  }

  private toOptionalNumber(value: string | undefined): number | null {
    if (!value) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
