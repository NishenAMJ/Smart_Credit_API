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
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  LoanApplicationStatus,
  RepaymentMethod,
  CreateLoanApplicationRequestDto,
  UpdateLoanApplicationRequestDto,
} from './dto/loan-application.dto';
import { BorrowerApplicationsService } from './borrower-applications.service';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Controller('borrower/applications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('borrower')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
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
    payload: CreateLoanApplicationRequestDto,
  ) {
    const id = request.user.sub;
    return {
      success: true,
      data: await this.borrowerApplicationsService.createLoanApplication(
        {
          borrowerId: id,
          adId: payload.adId,
          amount: Number(payload.amount),
          loanPurpose: payload.purpose,
          purposeDescription: payload.description,
          tenureMonths: Number(payload.tenureMonths),
          preferredRepaymentMethod:
            payload.preferredRepaymentMethod ?? RepaymentMethod.QR_PAYMENT,
          employmentStatus: payload.employmentStatus,
          monthlyIncome: payload.monthlyIncome,
          preferredInterestRate: payload.preferredInterestRate,
        },
        { submitImmediately: true },
      ),
    };
  }

  @Put(':requestId')
  async updateApplication(
    @Req() request: AuthenticatedRequest,
    @Param('requestId') requestId: string,
    @Body() payload: UpdateLoanApplicationRequestDto,
  ) {
    return {
      success: true,
      data: await this.borrowerApplicationsService.updateLoanApplication(
        requestId,
        request.user.sub,
        {
          amount: payload.amount,
          loanPurpose: payload.purpose,
          purposeDescription: payload.description,
          tenureMonths: payload.tenureMonths,
          preferredRepaymentMethod: payload.preferredRepaymentMethod,
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

  @Post(':requestId/cancel')
  async cancelApplication(
    @Req() request: AuthenticatedRequest,
    @Param('requestId') requestId: string,
  ) {
    return {
      success: true,
      data: await this.borrowerApplicationsService.cancelLoanApplication(
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
