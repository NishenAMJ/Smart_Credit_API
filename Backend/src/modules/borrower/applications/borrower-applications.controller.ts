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
} from '@nestjs/common';
import {
  LoanApplicationStatus,
  LoanPurpose,
  RepaymentMethod,
} from './dto/loan-application.dto';
import { resolveBorrowerId } from '../shared/borrower-request.utils';
import { BorrowerApplicationsService } from './borrower-applications.service';

@Controller('borrower/applications')
export class BorrowerApplicationsController {
  constructor(
    private readonly borrowerApplicationsService: BorrowerApplicationsService,
  ) {}

  @Get()
  async getMyApplications(
    @Query('borrowerId') borrowerId?: string,
    @Query('status') status?: LoanApplicationStatus,
  ) {
    return {
      success: true,
      data: await this.borrowerApplicationsService.getLoanApplications(
        resolveBorrowerId(borrowerId),
        status,
      ),
    };
  }

  @Get(':requestId')
  async getApplicationDetails(
    @Param('requestId') requestId: string,
    @Query('borrowerId') borrowerId?: string,
  ) {
    return {
      success: true,
      data: await this.borrowerApplicationsService.getLoanApplicationById(
        requestId,
        resolveBorrowerId(borrowerId),
      ),
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createApplication(
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
    @Query('borrowerId') borrowerId?: string,
  ) {
    const id = resolveBorrowerId(payload.borrowerId ?? borrowerId);
    const purpose = (payload.purpose ?? 'business').toLowerCase();
    const loanPurpose = (
      Object.values(LoanPurpose).includes(purpose as LoanPurpose)
        ? purpose
        : LoanPurpose.BUSINESS
    ) as LoanPurpose;

    return {
      success: true,
      data: await this.borrowerApplicationsService.createLoanApplication({
        borrowerId: id,
        adId: payload.adId,
        amount: Number(payload.amount),
        loanPurpose,
        purposeDescription: payload.description,
        tenureMonths: Number(payload.tenureMonths),
        preferredRepaymentMethod:
          (payload.preferredRepaymentMethod as RepaymentMethod) ??
          RepaymentMethod.QR_PAYMENT,
      }),
    };
  }

  @Put(':requestId')
  async updateApplication(
    @Param('requestId') requestId: string,
    @Body() payload: Record<string, unknown>,
    @Query('borrowerId') borrowerId?: string,
  ) {
    return {
      success: true,
      data: await this.borrowerApplicationsService.updateLoanApplication(
        requestId,
        resolveBorrowerId(borrowerId),
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
    @Param('requestId') requestId: string,
    @Query('borrowerId') borrowerId?: string,
  ) {
    return {
      success: true,
      data: await this.borrowerApplicationsService.submitLoanApplication(
        requestId,
        resolveBorrowerId(borrowerId),
      ),
    };
  }

  @Delete(':requestId')
  async deleteApplication(
    @Param('requestId') requestId: string,
    @Query('borrowerId') borrowerId?: string,
  ) {
    return {
      success: true,
      data: await this.borrowerApplicationsService.deleteLoanApplication(
        requestId,
        resolveBorrowerId(borrowerId),
      ),
    };
  }
}

