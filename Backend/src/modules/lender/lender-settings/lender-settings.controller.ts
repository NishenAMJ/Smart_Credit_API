import {
  BadRequestException,
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
import { LenderSettingsService } from './lender-settings.service';
import { LenderSettingsResponse } from './lender-settings.types';
import { UpdateLenderSettingsDto } from './lender-settings.dto';

@Controller('lender-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('lender')
export class LenderSettingsController {
  constructor(private readonly lenderSettingsService: LenderSettingsService) {}

  @Get(':lenderId')
  getSettings(
    @Req() req: AuthenticatedRequest,
    @Param('lenderId') lenderId: string,
  ): Promise<LenderSettingsResponse> {
    if (!lenderId.trim()) {
      throw new BadRequestException('lenderId is required.');
    }

    return this.lenderSettingsService.getSettings(
      resolveAuthenticatedLenderId(req.user.sub, lenderId),
    );
  }

  @Patch(':lenderId')
  updateSettings(
    @Req() req: AuthenticatedRequest,
    @Param('lenderId') lenderId: string,
    @Body() body: UpdateLenderSettingsDto,
  ): Promise<LenderSettingsResponse> {
    if (!lenderId.trim()) {
      throw new BadRequestException('lenderId is required.');
    }

    return this.lenderSettingsService.updateSettings(
      resolveAuthenticatedLenderId(req.user.sub, lenderId),
      body,
    );
  }
}
