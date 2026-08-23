import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { resolveAuthenticatedBorrowerId } from '../shared/borrower-request.utils';
import { LoanStatus } from '../types/borrower.types';
import { BorrowerLoansService } from './borrower-loans.service';

@Controller('borrower/loans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('borrower')
export class BorrowerLoansController {
  constructor(private readonly borrowerLoansService: BorrowerLoansService) {}

  @Get('featured')
  async getFeaturedLoans() {
    return {
      success: true,
      data: await this.borrowerLoansService.getFeaturedLoans(),
    };
  }

  @Get('search')
  async searchLoans(@Query('keyword') keyword = '') {
    return {
      success: true,
      data: await this.borrowerLoansService.searchLoans(keyword),
    };
  }

  @Get()
  async getMyLoans(
    @Req() req: AuthenticatedRequest,
    @Query('borrowerId') borrowerId?: string,
    @Query('status') status?: LoanStatus,
  ) {
    return {
      success: true,
      data: await this.borrowerLoansService.getLoans(
        resolveAuthenticatedBorrowerId(req.user.sub, borrowerId),
        status,
      ),
    };
  }

  @Get(':loanId')
  async getLoanDetails(
    @Req() req: AuthenticatedRequest,
    @Param('loanId') loanId: string,
    @Query('borrowerId') borrowerId?: string,
  ) {
    return {
      success: true,
      data: await this.borrowerLoansService.getLoanById(
        loanId,
        resolveAuthenticatedBorrowerId(req.user.sub, borrowerId),
      ),
    };
  }

  @Post('filter')
  async filterLoans(
    @Req() req: AuthenticatedRequest,
    @Body() filters: Record<string, unknown>,
    @Query('borrowerId') borrowerId?: string,
  ) {
    return {
      success: true,
      data: await this.borrowerLoansService.filterLoans(
        resolveAuthenticatedBorrowerId(req.user.sub, borrowerId),
        filters,
      ),
    };
  }
}
