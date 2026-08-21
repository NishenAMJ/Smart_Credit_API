import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  LoanApplicationStatus,
  LoanPurpose,
  RepaymentMethod,
} from './dto/loan-application.dto';
import { BorrowerApplicationsService } from './borrower-applications.service';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Controller('borrower/applications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('borrower')
export class BorrowerApplicationsController {
  constructor(
    private readonly borrowerApplicationsService: BorrowerApplicationsService,
  ) {}

  @Get()
  async getMyApplications(
    @Req() request: AuthenticatedRequest,
    @Query('status') status?: LoanApplicationStatus,
  ) {
    return {
      success: true,
      data: await this.borrowerApplicationsService.getLoanApplications(
        request.user.sub,
        status,
      ),
    };
  }

  @Get(':requestId')
  async getApplicationDetails(
    @Req() request: AuthenticatedRequest,
    @Param('requestId') requestId: string,
  ) {
    return {
      success: true,
      data: await this.borrowerApplicationsService.getLoanApplicationById(
        requestId,
        request.user.sub,
      ),
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createApplication(
    @Req() request: AuthenticatedRequest,
    @Body()
    payload: {
      amount?: number;
      purpose?: string;
      description?: string;
      tenureMonths?: number;
      preferredRepaymentMethod?: string;
      borrowerId?: string;
      adId?: string;
    },
  ) {
    const id = request.user.sub;
    const purpose = (payload.purpose ?? 'business').toLowerCase();
    const loanPurpose = (
      Object.values(LoanPurpose).includes(purpose as LoanPurpose)
        ? purpose
        : LoanPurpose.BUSINESS
    ) as LoanPurpose;

    return {
      success: true,
      data: await this.borrowerApplicationsService.createLoanApplication(
        {
          borrowerId: id,
          adId: payload.adId,
          amount: Number(payload.amount),
          loanPurpose,
          purposeDescription: payload.description,
          tenureMonths: Number(payload.tenureMonths),
          preferredRepaymentMethod:
            (payload.preferredRepaymentMethod as RepaymentMethod) ??
            RepaymentMethod.QR_PAYMENT,
        },
        { submitImmediately: true },
      ),
    };
  }

  @Put(':requestId')
  async updateApplication(
    @Req() request: AuthenticatedRequest,
    @Param('requestId') requestId: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return {
      success: true,
      data: await this.borrowerApplicationsService.updateLoanApplication(
        requestId,
        request.user.sub,
        {
          amount: payload.amount as number | undefined,
          purposeDescription: payload.description as string | undefined,
          tenureMonths: payload.tenureMonths as number | undefined,
        },
      ),
    };
  }

  @Post(':requestId/submit')
  async submitApplication(
    @Req() request: AuthenticatedRequest,
    @Param('requestId') requestId: string,
  ) {
    return {
      success: true,
      data: await this.borrowerApplicationsService.submitLoanApplication(
        requestId,
        request.user.sub,
      ),
    };
  }

  @Delete(':requestId')
  async deleteApplication(
    @Req() request: AuthenticatedRequest,
    @Param('requestId') requestId: string,
  ) {
    return {
      success: true,
      data: await this.borrowerApplicationsService.deleteLoanApplication(
        requestId,
        request.user.sub,
      ),
    };
  }
}
