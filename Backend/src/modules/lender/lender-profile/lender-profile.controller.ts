import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { resolveAuthenticatedLenderId } from '../lender-request.utils';
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
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('lender')
export class LenderProfileController {
  constructor(private readonly lenderProfileService: LenderProfileService) {}

  @Get(':lenderId')
  getProfile(
    @Req() request: AuthenticatedRequest,
    @Param('lenderId') lenderId: string,
  ): Promise<LenderProfileResponse> {
    return this.lenderProfileService.getProfile(
      resolveAuthenticatedLenderId(request.user.sub, lenderId),
    );
  }

  @Patch(':lenderId')
  updateProfile(
    @Req() request: AuthenticatedRequest,
    @Param('lenderId') lenderId: string,
    @Body() body: UpdateLenderProfileBody,
  ): Promise<LenderProfileResponse> {
    return this.lenderProfileService.updateProfile(
      resolveAuthenticatedLenderId(request.user.sub, lenderId),
      this.toUpdateInput(body),
    );
  }

  private toUpdateInput(
    body: UpdateLenderProfileBody,
  ): UpdateLenderProfileInput {
    return {
      fullName: typeof body.fullName === 'string' ? body.fullName : undefined,
      email: typeof body.email === 'string' ? body.email : undefined,
      phone: typeof body.phone === 'string' ? body.phone : undefined,
      address: typeof body.address === 'string' ? body.address : undefined,
      city: typeof body.city === 'string' ? body.city : undefined,
      district: typeof body.district === 'string' ? body.district : undefined,
      businessName:
        typeof body.businessName === 'string' ? body.businessName : undefined,
      responseTimeHours: this.toOptionalNumber(body.responseTimeHours),
      preferredRegions: Array.isArray(body.preferredRegions)
        ? body.preferredRegions.filter(
            (value): value is string => typeof value === 'string',
          )
        : typeof body.preferredRegions === 'string'
          ? body.preferredRegions
              .split(',')
              .map((value) => value.trim())
              .filter((value) => value.length > 0)
          : undefined,
    };
  }

  private toOptionalNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }
}
