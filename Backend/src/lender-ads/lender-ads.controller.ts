import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import {
  CreateLenderAdInput,
  LenderAdResponse,
  LenderAdsListResponse,
} from './lender-ads.types';
import { LenderAdsService } from './lender-ads.service';

type CreateLenderAdBody = {
  lenderId?: string;
  lenderName?: string | null;
  headline?: string;
  minAmount?: number | string;
  maxAmount?: number | string;
  interestRate?: number | string;
  tenureMonths?: number | string;
  borrowerFocus?: string;
  processingTime?: string;
  repaymentStyle?: string;
  requirements?: string;
  supportNote?: string;
};

@Controller('lender-ads')
export class LenderAdsController {
  constructor(private readonly lenderAdsService: LenderAdsService) {}

  @Post()
  createAd(@Body() body: CreateLenderAdBody): Promise<LenderAdResponse> {
    return this.lenderAdsService.createAd(this.toCreateInput(body));
  }

  @Get()
  getAdsForLender(
    @Query('lenderId') lenderId: string | undefined,
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ): Promise<LenderAdsListResponse> {
    if (!lenderId?.trim()) {
      throw new BadRequestException('lenderId is required.');
    }

    return this.lenderAdsService.getAdsForLender(
      lenderId.trim(),
      this.toOptionalNumber(pageSize) ?? this.toOptionalNumber(limit) ?? 6,
      cursor?.trim() || null,
    );
  }

  private toCreateInput(body: CreateLenderAdBody): CreateLenderAdInput {
    return {
      lenderId: typeof body.lenderId === 'string' ? body.lenderId : '',
      lenderName: typeof body.lenderName === 'string' ? body.lenderName : null,
      headline: typeof body.headline === 'string' ? body.headline : '',
      minAmount: this.toNumber(body.minAmount, 'minAmount'),
      maxAmount: this.toNumber(body.maxAmount, 'maxAmount'),
      interestRate: this.toNumber(body.interestRate, 'interestRate'),
      tenureMonths: this.toNumber(body.tenureMonths, 'tenureMonths'),
      borrowerFocus:
        typeof body.borrowerFocus === 'string' ? body.borrowerFocus : '',
      processingTime:
        typeof body.processingTime === 'string' ? body.processingTime : '',
      repaymentStyle:
        typeof body.repaymentStyle === 'string' ? body.repaymentStyle : '',
      requirements: typeof body.requirements === 'string' ? body.requirements : '',
      supportNote: typeof body.supportNote === 'string' ? body.supportNote : '',
    };
  }

  private toNumber(value: unknown, fieldName: string): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    throw new BadRequestException(`${fieldName} must be a valid number.`);
  }

  private toOptionalNumber(value: string | undefined): number | null {
    if (!value) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
