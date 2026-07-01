import { Body, Controller, Get, Patch, Query, Req, UseGuards } from '@nestjs/common';

import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { NearbyQuery } from './dto/location.dto';
import { UpdateLocationDto } from './dto/location.dto';
import { LocationService } from './location.service';

@UseGuards(JwtAuthGuard)
@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Patch('me')
  async updateMyLocation(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateLocationDto,
  ) {
    return {
      success: true,
      data: await this.locationService.updateMyLocation(request.user, dto),
    };
  }

  @Get('lenders/nearby')
  async getNearbyLenders(
    @Req() request: AuthenticatedRequest,
    @Query() query: NearbyQuery,
  ) {
    return {
      success: true,
      data: await this.locationService.getNearbyLenders(request.user, query),
    };
  }

  @Get('borrowers/nearby')
  async getNearbyBorrowers(
    @Req() request: AuthenticatedRequest,
    @Query() query: NearbyQuery,
  ) {
    return {
      success: true,
      data: await this.locationService.getNearbyBorrowers(request.user, query),
    };
  }
}
