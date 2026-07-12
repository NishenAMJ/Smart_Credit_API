import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { LenderLoansService } from './lender-loans.service';
import { LenderLoansResponse } from './lender-loans.types';

@Controller('lender/loans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('lender')
export class LenderLoansController {
  constructor(private readonly lenderLoansService: LenderLoansService) {}

  @Get()
  getLoans(
    @Req() request: AuthenticatedRequest,
    @Query('pageSize', new DefaultValuePipe(15), ParseIntPipe) pageSize: number,
    @Query('cursor') cursor?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ): Promise<LenderLoansResponse> {
    return this.lenderLoansService.getLoans(
      request.user.sub,
      pageSize,
      cursor?.trim() || null,
      status?.trim() || null,
      search?.trim() || null,
    );
  }
}
