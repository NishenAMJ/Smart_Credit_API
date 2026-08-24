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
import { LenderProfileResponse } from './lender-profile.types';
import { UpdateLenderProfileDto } from './lender-profile.dto';

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
    @Body() body: UpdateLenderProfileDto,
  ): Promise<LenderProfileResponse> {
    return this.lenderProfileService.updateProfile(
      resolveAuthenticatedLenderId(request.user.sub, lenderId),
      {
        ...body,
        preferredRegions: body.preferredRegions
          ? Array.from(
              new Set(body.preferredRegions.map((value) => value.trim())),
            ).filter(Boolean)
          : undefined,
      },
    );
  }
}
