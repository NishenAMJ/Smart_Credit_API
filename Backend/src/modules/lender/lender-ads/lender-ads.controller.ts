import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import {
  CreateLenderAdInput,
  LenderAdResponse,
  LenderAdsListResponse,
} from './lender-ads.types';
import { LenderAdsService } from './lender-ads.service';

type CreateLenderAdBody = {
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

type UpdateLenderAdBody = Partial<CreateLenderAdBody> & {
  status?: string;
};

@Controller('lender-ads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('lender')
export class LenderAdsController {
  constructor(private readonly lenderAdsService: LenderAdsService) {}

  @Post()
  createAd(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateLenderAdBody,
  ): Promise<LenderAdResponse> {
    return this.lenderAdsService.createAd(
      request.user.sub,
      this.toCreateInput(body),
    );
  }

  @Get()
  getAdsForLender(
    @Req() request: AuthenticatedRequest,
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('status') status?: string,
  ): Promise<LenderAdsListResponse> {
    return this.lenderAdsService.getAdsForLender(
      request.user.sub,
      this.toOptionalNumber(pageSize) ?? this.toOptionalNumber(limit) ?? 6,
      cursor?.trim() || null,
      status?.trim() || null,
    );
  }

  @Patch(':adId')
  updateAd(
    @Req() request: AuthenticatedRequest,
    @Param('adId') adId: string,
    @Body() body: UpdateLenderAdBody,
  ): Promise<LenderAdResponse> {
    return this.lenderAdsService.updateAd(
      request.user.sub,
      adId,
      this.toUpdateInput(body),
    );
  }

  private toUpdateInput(body: UpdateLenderAdBody) {
    return {
      headline:
        typeof body.headline === 'string' ? body.headline : undefined,
      minAmount: this.toOptionalBodyNumber(body.minAmount, 'minAmount'),
      maxAmount: this.toOptionalBodyNumber(body.maxAmount, 'maxAmount'),
      interestRate: this.toOptionalBodyNumber(
        body.interestRate,
        'interestRate',
      ),
      tenureMonths: this.toOptionalBodyNumber(
        body.tenureMonths,
        'tenureMonths',
      ),
      borrowerFocus:
        typeof body.borrowerFocus === 'string'
          ? body.borrowerFocus
          : undefined,
      processingTime:
        typeof body.processingTime === 'string'
          ? body.processingTime
          : undefined,
      repaymentStyle:
        typeof body.repaymentStyle === 'string'
          ? body.repaymentStyle
          : undefined,
      requirements:
        typeof body.requirements === 'string' ? body.requirements : undefined,
      supportNote:
        typeof body.supportNote === 'string' ? body.supportNote : undefined,
      status: typeof body.status === 'string' ? body.status : undefined,
    };
  }

  private toCreateInput(body: CreateLenderAdBody): CreateLenderAdInput {
    return {
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
      requirements:
        typeof body.requirements === 'string' ? body.requirements : '',
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


  private toOptionalBodyNumber(
    value: number | string | undefined,
    fieldName: string,
  ): number | undefined {
    return value === undefined ? undefined : this.toNumber(value, fieldName);
  }
}
