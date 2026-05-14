import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { LenderService } from './lender.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateLenderDto } from './dto/create-lender.dto';
import { UpdateLenderDto } from './dto/update-lender.dto';
import { CreateLoanOfferDto } from './dto/create-loan-offer.dto';
import { UpdateLoanOfferDto } from './dto/update-loan-offer.dto';

@Controller('lender')
export class LenderController {
  constructor(private readonly lenderService: LenderService) {}

  // Public endpoint - deprecated, use auth/register instead
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createLender(@Body() createLenderDto: CreateLenderDto) {
    return this.lenderService.createLender(createLenderDto);
  }

  // Public endpoint - anyone can view lender profiles
  @Get(':id')
  async getLenderById(@Param('id') id: string) {
    return this.lenderService.findLenderById(id);
  }

  // Protected - only the lender themselves can update their profile
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('lender')
  async updateLender(
    @Param('id') id: string,
    @Body() updateLenderDto: UpdateLenderDto,
    @Request() req,
  ) {
    // Ensure lender can only update their own profile
    if (req.user.lenderProfileId !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.lenderService.updateLender(id, updateLenderDto);
  }

  // Public endpoint - anyone can browse lenders
  @Get()
  async getAllLenders() {
    return this.lenderService.getAllLenders();
  }

  // Protected - only lenders can create offers on their profile
  @Post(':id/offers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('lender')
  @HttpCode(HttpStatus.CREATED)
  async createLoanOffer(
    @Param('id') lenderId: string,
    @Body() createLoanOfferDto: CreateLoanOfferDto,
    @Request() req,
  ) {
    // Ensure lender can only create offers for themselves
    if (req.user.lenderProfileId !== lenderId) {
      throw new ForbiddenException('You can only create offers for your own profile');
    }
    createLoanOfferDto.lenderId = lenderId;
    return this.lenderService.createLoanOffer(createLoanOfferDto);
  }

  // Public endpoint - anyone can view a lender's offers
  @Get(':id/offers')
  async getLenderOffers(@Param('id') lenderId: string) {
    return this.lenderService.getLoanOffersByLender(lenderId);
  }

  // Protected - only the lender can update their own offers
  @Put('offers/:offerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('lender')
  async updateLoanOffer(
    @Param('offerId') offerId: string,
    @Body() updateLoanOfferDto: UpdateLoanOfferDto,
    @Request() req,
  ) {
    // Verify the offer belongs to this lender
    const offer = await this.lenderService.getLoanOfferById(offerId);
    if (offer.lenderId !== req.user.lenderProfileId) {
      throw new ForbiddenException('You can only update your own offers');
    }
    return this.lenderService.updateLoanOffer(offerId, updateLoanOfferDto);
  }

  // Protected - lender's own dashboard
  @Get(':id/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('lender')
  async getDashboard(@Param('id') lenderId: string, @Request() req) {
    // Ensure lender can only view their own dashboard
    if (req.user.lenderProfileId !== lenderId) {
      throw new ForbiddenException('You can only view your own dashboard');
    }
    return this.lenderService.getDashboardStats(lenderId);
  }
}
