import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { AdsService } from './ads.service';
import { ApproveAdDto } from './dto/approve-ad.dto';
import { RejectAdDto } from './dto/reject-ad.dto';

@Controller('admin/ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

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

  @Delete(':adId')
  async deleteAd(@Param('adId') adId: string) {
    return this.adsService.deleteAd(adId);
  }
}
