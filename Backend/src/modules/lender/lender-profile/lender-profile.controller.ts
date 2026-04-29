import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
} from '@nestjs/common';
import { LenderProfileService } from './lender-profile.service';
import {
  LenderProfileResponse,
  UpdateLenderProfileInput,
} from './lender-profile.types';

type UpdateLenderProfileBody = {
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  district?: string;
  businessName?: string;
  responseTimeHours?: number | string;
  preferredRegions?: string[] | string;
};

@Controller('lender-profile')
export class LenderProfileController {
  constructor(private readonly lenderProfileService: LenderProfileService) {}

  @Get(':lenderId')
  getProfile(
    @Param('lenderId') lenderId: string,
  ): Promise<LenderProfileResponse> {
    if (!lenderId.trim()) {
      throw new BadRequestException('lenderId is required.');
    }

    return this.lenderProfileService.getProfile(lenderId.trim());
  }

  @Patch(':lenderId')
  updateProfile(
    @Param('lenderId') lenderId: string,
    @Body() body: UpdateLenderProfileBody,
  ): Promise<LenderProfileResponse> {
    if (!lenderId.trim()) {
      throw new BadRequestException('lenderId is required.');
    }

    return this.lenderProfileService.updateProfile(
      lenderId.trim(),
      this.toUpdateInput(body),
    );
  }

  private toUpdateInput(
    body: UpdateLenderProfileBody,
  ): UpdateLenderProfileInput {
    return {
      fullName: typeof body.fullName === 'string' ? body.fullName : '',
      email: typeof body.email === 'string' ? body.email : '',
      phone: typeof body.phone === 'string' ? body.phone : '',
      address: typeof body.address === 'string' ? body.address : '',
      city: typeof body.city === 'string' ? body.city : '',
      district: typeof body.district === 'string' ? body.district : '',
      businessName:
        typeof body.businessName === 'string' ? body.businessName : '',
      responseTimeHours: this.toNumber(body.responseTimeHours),
      preferredRegions: Array.isArray(body.preferredRegions)
        ? body.preferredRegions.filter(
            (value): value is string => typeof value === 'string',
          )
        : typeof body.preferredRegions === 'string'
          ? body.preferredRegions
              .split(',')
              .map((value) => value.trim())
              .filter((value) => value.length > 0)
          : [],
    };
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return 0;
  }
}
