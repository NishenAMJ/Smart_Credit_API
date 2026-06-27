// Advertisement controller handles all HTTP requests for ads
// Users can create ads, search ads, boost them, and view analytics

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CreateAdDto }  from './dto/create-ad.dto';
import { UpdateAdDto }  from './dto/update-ad.dto';
import { BoostAdDto }   from './dto/boost-ad.dto';
import { AdvertisementCreateService }   from './services/advertisement-create.service';
import { AdvertisementReadService }     from './services/advertisement-read.service';
import { AdvertisementUpdateService }   from './services/advertisement-update.service';
import { AdvertisementDeleteService }   from './services/advertisement-delete.service';
import { AdvertisementBoostService }    from './services/advertisement-boost.service';
import { AdvertisementAnalyticsService }    from './services/advertisement-analytics.service';

// Note: In production use JWT guards to get lenderId from auth token
// Currently lenderId is passed as query param for testing

@Controller('advertisements')
export class AdvertisementController {
  constructor(
    private readonly createService:   AdvertisementCreateService,
    private readonly readService:     AdvertisementReadService,
    private readonly updateService:   AdvertisementUpdateService,
    private readonly deleteService:   AdvertisementDeleteService,
    private readonly boostService:    AdvertisementBoostService,
    private readonly analyticsService: AdvertisementAnalyticsService,
  ) {}

  // Get list of available boost packages with pricing
  @Get('boost-packages')
  getBoostPackages() {
    return this.boostService.getBoostPackages();
  }  //ok

  // Get full analytics for all ads by a lender
  @Get('analytics/summary')
  async getLenderAnalytics(
    @Query('lenderId') lenderId: string,
  ) {
    return this.analyticsService.getLenderAnalytics(lenderId);
  }//ok

  // Get lender's own ads including view counts and click stats
  @Get('my')
  async getMyAds(@Query('lenderId') lenderId: string) {
    return this.readService.getMyAds(lenderId);
  }

  // Get public ads from a lender (hides sensitive stats)
  @Get('lender/:lenderId')
  async getAdsByLender(@Param('lenderId') lenderId: string) {
    return this.readService.getAdsByLender(lenderId);
  }

  // Get analytics for a specific ad (lender only)
  @Get(':id/analytics')
  async getAdAnalytics(
    @Param('id')             adId:     string,
    @Query('lenderId') lenderId: string,
  ) {
    return this.readService.getAdAnalytics(adId, lenderId);
  }

  // Get detailed analytics for one specific ad
  @Get(':id/analytics/full')
  async getFullAdAnalytics(
    @Param('id')       adId:     string,
    @Query('lenderId') lenderId: string,
  ) {
    return this.analyticsService.getAdAnalytics(adId, lenderId);
  }

  // Get single ad by ID
  @Get(':id')
  async getAdById(@Param('id') id: string) {
    return this.readService.getAdById(id);
  }

  // Get all active ads with optional filtering
  // Filters: location, purpose, minAmount, maxAmount, search keyword
  @Get()
  async getAllActiveAds(
    @Query('location')  location?:  string,
    @Query('purpose')   purpose?:   string,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
    @Query('search')    search?:    string,
  ) {
    return this.readService.getAllActiveAds({
      location,
      purpose,
      minAmount: minAmount ? Number(minAmount) : undefined,
      maxAmount: maxAmount ? Number(maxAmount) : undefined,
      search,
    });
  }

  // Create a new lending ad
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAd(
    @Query('lenderId') lenderId: string,
    @Body() dto: CreateAdDto,
  ) {
    return this.createService.createAd(lenderId, dto);
  }

  // Track when a borrower views an ad (for analytics)
  @Post(':id/view')
  @HttpCode(HttpStatus.OK)
  async trackView(@Param('id') id: string) {
    await this.readService.incrementViews(id);
    return { message: 'View recorded' };
  }

  
  // POST /advertisements/:id/click
  // Track when borrower clicks apply on an ad
  
  @Post(':id/click')
  @HttpCode(HttpStatus.OK)
  async trackClick(@Param('id') id: string) {
    await this.readService.incrementClicks(id);
    return { message: 'Click recorded' };
  }

  
  // POST /advertisements/:id/boost
  // Boost an ad (lender pays admin)
  
  @Post(':id/boost')
  @HttpCode(HttpStatus.OK)
  async boostAd(
    @Param('id')             adId:     string,
    @Query('lenderId') lenderId: string,
    @Body() dto: BoostAdDto,
  ) {
    return this.boostService.boostAd(adId, lenderId, dto);
  }

  
  // PATCH /advertisements/:id
  // Update an existing ad
  
  @Patch(':id')
  async updateAd(
    @Param('id')             adId:     string,
    @Query('lenderId') lenderId: string,
    @Body() dto: UpdateAdDto,
  ) {
    return this.updateService.updateAd(adId, lenderId, dto);
  }

  
  // PATCH /advertisements/:id/pause
  // Pause an active ad
  
  @Patch(':id/pause')
  async pauseAd(
    @Param('id')             adId:     string,
    @Query('lenderId') lenderId: string,
  ) {
    return this.updateService.pauseAd(adId, lenderId);
  }

  
  // PATCH /advertisements/:id/activate
  // Re-activate a paused ad
 
  @Patch(':id/activate')
  async activateAd(
    @Param('id')             adId:     string,
    @Query('lenderId') lenderId: string,
  ) {
    return this.updateService.activateAd(adId, lenderId);
  }

  
  // PATCH /advertisements/:id/boost/cancel
  // Cancel an active boost
  
  @Patch(':id/boost/cancel')
  async cancelBoost(
    @Param('id')             adId:     string,
    @Query('lenderId') lenderId: string,
  ) {
    return this.boostService.cancelBoost(adId, lenderId);
  }

  
  // DELETE /advertisements/:id
  // Soft delete — marks as expired
  
  @Delete(':id')
  async deleteAd(
    @Param('id')             adId:     string,
    @Query('lenderId') lenderId: string,
  ) {
    return this.deleteService.softDeleteAd(adId, lenderId);
  }

  
  // DELETE /advertisements/:id/hard
  // Hard delete — permanently removes ad
   
  @Delete(':id/hard')
  async hardDeleteAd(
    @Param('id')             adId:     string,
    @Query('lenderId') lenderId: string,
  ) {
    return this.deleteService.deleteAd(adId, lenderId);
  }
}
