import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdsService } from './ads.service';
import { ApproveAdDto } from './dto/approve-ad.dto';
import { RejectAdDto } from './dto/reject-ad.dto';
import { UpdateAdStatusDto } from './dto/update-ad-status.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('admin/ads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  // Returns the summary counts for the admin dashboard.
  @Get('stats')
  async getAdStats() {
    return this.adsService.getAdStats();
  }

  // Returns a paginated list of lender ads for admin review.
  @Get()
  async getAllAds(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.adsService.getAllAds(limit, cursor);
  }

  // Returns only ads that are still waiting for review of the admin.
  @Get('pending')
  async getPendingAds(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.adsService.getPendingAds(limit, cursor);
  }

  // Returns one ad so the admin can inspect it.
  @Get(':adId')
  async getAdById(@Param('adId') adId: string) {
    return this.adsService.getAdById(adId);
  }

  // Marks an ad as approved and stores review notes.
  @Post(':adId/approve')
  async approveAd(
    @Param('adId') adId: string,
    @Body() approveAdDto: ApproveAdDto,
  ) {
    return this.adsService.approveAd(adId, approveAdDto.notes);
  }

  // Marks an ad as rejected and stores the rejection reason.
  @Post(':adId/reject')
  async rejectAd(
    @Param('adId') adId: string,
    @Body() rejectAdDto: RejectAdDto,
  ) {
    return this.adsService.rejectAd(adId, rejectAdDto.reason);
  }

  // Moves an ad between moderation states.
  @Patch(':adId/status')
  async updateAdStatus(
    @Param('adId') adId: string,
    @Body() updateAdStatusDto: UpdateAdStatusDto,
  ) {
    return this.adsService.updateAdStatus(adId, updateAdStatusDto.status, {
      reason: updateAdStatusDto.reason,
      notes: updateAdStatusDto.notes,
    });
  }

  // Permanently deletes an ad from Firestore.
  @Delete(':adId')
  async deleteAd(@Param('adId') adId: string) {
    return this.adsService.deleteAd(adId);
  }
}
