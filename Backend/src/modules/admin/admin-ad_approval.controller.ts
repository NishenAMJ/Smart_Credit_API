import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AdminAdApprovalService } from './admin-ad_approval.service';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

class RejectAdDto {
  reason!: string;
}

@Controller('admin/ads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminAdApprovalController {
  constructor(private readonly approvalService: AdminAdApprovalService) {}

  // Static routes must remain above :adId routes.
  @Get('stats')
  async getAdStats() {
    return this.approvalService.getAdStats();
  }

  // GET /admin/ads/pending/count
  // Badge count for admin dashboard
  @Get('pending/count')
  async getPendingCount() {
    const response = await this.approvalService.getAdStats();
    return { count: response.stats.pending };
  }

  // GET /admin/ads?status=pending|active|rejected|closed|all
  // List ads filtered by status
  @Get()
  async getAds(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('status')
    status?: 'pending' | 'active' | 'rejected' | 'closed',
    @Query('search') search?: string,
  ) {
    return this.approvalService.getAds(limit, cursor, status, search);
  }

  // GET /admin/ads/:adId
  // Full detail of one ad for review
  @Get(':adId')
  async getAdDetail(@Param('adId') adId: string) {
    return this.approvalService.getAdDetail(adId);
  }

  // POST /admin/ads/:adId/approve
  // Approve a pending ad → sets status to 'active'
  @Post(':adId/approve')
  @HttpCode(HttpStatus.OK)
  async approveAd(
    @Param('adId') adId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.approvalService.approveAd(adId, req.user.sub);
  }

  // POST /admin/ads/:adId/reject
  // Reject a pending ad with a reason
  @Post(':adId/reject')
  @HttpCode(HttpStatus.OK)
  async rejectAd(
    @Param('adId') adId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: RejectAdDto,
  ) {
    return this.approvalService.rejectAd(adId, req.user.sub, dto.reason);
  }
}
