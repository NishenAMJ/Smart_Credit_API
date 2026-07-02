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
  BadRequestException,
} from '@nestjs/common';
import { AdminAdApprovalService } from './admin-ad_approval.service';
import { Roles }        from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard }   from '../auth/guards/roles.guard';

class RejectAdDto {
  reason!: string;
}

// ── NOTE ──────────────────────────────────────────────────────
// adminId is taken from query param for now (same pattern as
// the existing admin controller). Replace with @Req() user.uid
// once JWT is fully wired to return the admin's uid.
// ─────────────────────────────────────────────────────────────

@Controller('admin/ads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminAdApprovalController {
  constructor(private readonly approvalService: AdminAdApprovalService) {}

  // GET /admin/ads/pending/count
  // Badge count for admin dashboard
  @Get('pending/count')
  async getPendingCount() {
    return this.approvalService.getPendingCount();
  }

  // GET /admin/ads?status=pending|active|rejected|all
  // List ads filtered by status
  @Get()
  async getAdsByStatus(@Query('status') status?: string) {
    return this.approvalService.getAdsByStatus(status ?? 'pending');
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
    @Param('adId')     adId:    string,
    @Query('adminId')  adminId: string,
  ) {
    if (!adminId) throw new BadRequestException('adminId query param required');
    return this.approvalService.approveAd(adId, adminId);
  }

  // POST /admin/ads/:adId/reject
  // Reject a pending ad with a reason
  @Post(':adId/reject')
  @HttpCode(HttpStatus.OK)
  async rejectAd(
    @Param('adId')    adId:    string,
    @Query('adminId') adminId: string,
    @Body()           dto:     RejectAdDto,
  ) {
    if (!adminId)    throw new BadRequestException('adminId query param required');
    if (!dto.reason) throw new BadRequestException('reason is required in body');
    return this.approvalService.rejectAd(adId, adminId, dto.reason);
  }
}