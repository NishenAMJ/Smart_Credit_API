import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  Query,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { LenderOffersService } from './lender_offers.service';
import type { CreateOfferInput, UpdateOfferInput } from './lender_offers.service';

@Controller('lender-mobile/offers')
export class LenderOffersController {
  private readonly logger = new Logger(LenderOffersController.name);

  constructor(private readonly offersService: LenderOffersService) {}

  /**
   * POST /api/lender-mobile/offers?lenderId=
   * Create a new loan offer for the authenticated lender.
   */
  @Post()
  async createOffer(
    @Query('lenderId') lenderId: string,
    @Body() body: Record<string, any>,
  ) {
    if (!lenderId?.trim()) {
      throw new BadRequestException('lenderId is required.');
    }

    this.logger.log(`Creating offer for lender ${lenderId}`);
    const offer = await this.offersService.createOffer(lenderId.trim(), body);
    return { success: true, message: 'Offer created successfully', data: offer };
  }

  /**
   * PATCH /api/lender-mobile/offers/:offerId?lenderId=
   * Update an existing loan offer (must belong to this lender).
   */
  @Patch(':offerId')
  async updateOffer(
    @Param('offerId') offerId: string,
    @Query('lenderId') lenderId: string,
    @Body() body: Record<string, any>,
  ) {
    if (!lenderId?.trim()) {
      throw new BadRequestException('lenderId is required.');
    }

    this.logger.log(`Updating offer ${offerId} for lender ${lenderId}`);
    const offer = await this.offersService.updateOffer(lenderId.trim(), offerId, body);
    return { success: true, message: 'Offer updated successfully', data: offer };
  }
}
