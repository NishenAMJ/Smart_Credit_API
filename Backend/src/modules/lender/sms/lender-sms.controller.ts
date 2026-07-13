import {
  Body,
  Controller,
  Get,
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
import { LenderSmsService } from './lender-sms.service';
import type {
  LenderSmsSettings,
  SendSmsInput,
  SendSmsResponse,
  SmsBorrowerSearchResponse,
} from './lender-sms.types';

@Controller('lender/sms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('lender')
export class LenderSmsController {
  constructor(private readonly smsService: LenderSmsService) {}

  @Get('settings')
  getSettings(
    @Req() request: AuthenticatedRequest,
  ): Promise<LenderSmsSettings> {
    return this.smsService.getSettings(request.user.sub);
  }

  @Patch('settings')
  updateSettings(
    @Req() request: AuthenticatedRequest,
    @Body() body: { enabled?: boolean },
  ): Promise<LenderSmsSettings> {
    return this.smsService.setEnabled(request.user.sub, body?.enabled);
  }

  @Get('borrowers')
  searchBorrowers(
    @Req() request: AuthenticatedRequest,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ): Promise<SmsBorrowerSearchResponse> {
    return this.smsService.searchBorrowers(
      request.user.sub,
      search?.trim() ?? '',
      this.toNumber(limit) ?? 30,
    );
  }

  @Post('send')
  send(
    @Req() request: AuthenticatedRequest,
    @Body() body: SendSmsInput,
  ): Promise<SendSmsResponse> {
    return this.smsService.send(request.user.sub, body);
  }

  private toNumber(value: string | undefined): number | null {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
