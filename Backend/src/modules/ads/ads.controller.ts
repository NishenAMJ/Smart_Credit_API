import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AdsService } from './ads.service';
import { ApproveAdDto } from './dto/approve-ad.dto';
import { RejectAdDto } from './dto/reject-ad.dto';
import { UpdateAdStatusDto } from './dto/update-ad-status.dto';
import { AdminJwtGuard } from '../admin/admin-auth/guards/admin-jwt.guard';

@Controller('admin/ads')
@UseGuards(AdminJwtGuard)
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get()
  async getAllAds() {
    return this.adsService.getAllAds();
  }

  @Get('pending')
  async getPendingAds() {
    return this.adsService.getPendingAds();
  }

  @Get(':adId')
  async getAdById(@Param('adId') adId: string) {
    return this.adsService.getAdById(adId);
  }

  @Post(':adId/approve')
  async approveAd(
    @Param('adId') adId: string,
    @Body() approveAdDto: ApproveAdDto,
  ) {
    return this.adsService.approveAd(adId, approveAdDto.notes);
  }

  @Post(':adId/reject')
  async rejectAd(
    @Param('adId') adId: string,
    @Body() rejectAdDto: RejectAdDto,
  ) {
    return this.adsService.rejectAd(adId, rejectAdDto.reason);
  }

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

  @Delete(':adId')
  async deleteAd(@Param('adId') adId: string) {
    return this.adsService.deleteAd(adId);
  }
}
