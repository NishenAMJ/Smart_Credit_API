import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { BorrowerService } from './borrower.service';
import { CreateBorrowerProfileDto } from './dto/create-profile.dto';
import { UpdateBorrowerProfileDto } from './dto/update-profile.dto';
import {
  LoanApplicationStatus,
  LoanPurpose,
  RepaymentMethod,
} from './dto/loan-application.dto';
import { LoanStatus } from './interfaces/borrower.interface';
import {
  BORROWER_DEFAULTS,
  BORROWER_FILTER_LIMITS,
  BORROWER_FLOW,
} from './borrower.constants';

@Controller('borrower')
export class BorrowerController {
  constructor(private readonly borrowerService: BorrowerService) {}


  /**
   * Uses the supplied borrower id, falling back to demo data for mobile screens.
   */
  private resolveBorrowerId(borrowerId?: string): string {
    const trimmed = borrowerId?.trim();
    return trimmed && trimmed.length > 0
      ? trimmed
      : BORROWER_DEFAULTS.DEMO_BORROWER_ID;
  }

  /**
   * POST /borrower/profile
   * Creates a new borrower profile.
   */
  @Post('profile')
  @HttpCode(HttpStatus.CREATED)
  async createProfile(@Body() dto: CreateBorrowerProfileDto) {
    return this.borrowerService.createProfile(dto);
  }

  /**
   * GET /borrower/profile/:userId
   * Gets a borrower profile by user id.
   */
  @Get('profile/:userId')
  async getProfile(@Param('userId') userId: string) {
    return this.borrowerService.getProfile(userId);
  }

  /**
   * PUT /borrower/profile/:userId
   * Updates borrower profile details.
   */
  @Put('profile/:userId')
  async updateProfile(
    @Param('userId') userId: string,
    @Body() dto: UpdateBorrowerProfileDto,
  ) {
    return this.borrowerService.updateProfile(userId, dto);
  }

  /**
   * GET /borrower/dashboard/:userId
   * Returns borrower dashboard metrics for the supplied user id.
   */
  @Get('dashboard/:userId')
  async getDashboard(@Param('userId') userId: string) {
    return {
      success: true,
      // Compose dashboard metrics from profile, loans, and recent activity.
      data: await this.borrowerService.getDashboard(userId),
    };
  }

  /**
   * GET /borrower/loans/featured
   * Returns a compact list of active loans for discovery cards.
   */
  @Get('loans/featured')
  async getFeaturedLoans(@Query('borrowerId') borrowerId?: string) {
    const id = this.resolveBorrowerId(borrowerId);
    const loans = await this.borrowerService.getLoans(id);

    return {
      success: true,
      // Keep featured cards focused on active loans and cap payload size for mobile.
      data: loans
        .filter((loan) => loan.status === LoanStatus.ACTIVE)
        .slice(0, BORROWER_FLOW.FEATURED_LOAN_LIMIT),
    };
  }

  /**
   * GET /borrower/loans/search
   * Searches loans using a keyword against common identifier fields.
   */
  @Get('loans/search')
  async searchLoans(
    @Query('keyword') keyword = '',
    @Query('borrowerId') borrowerId?: string,
  ) {
    const id = this.resolveBorrowerId(borrowerId);
    const loans = await this.borrowerService.getLoans(id);
    const normalized = keyword.trim().toLowerCase();

    const filtered =
      normalized.length === 0
        ? loans
        : loans.filter((loan) => {
            // Search across all fields in the loan object dynamically
            const haystack = JSON.stringify(loan).toLowerCase();
            return haystack.includes(normalized);
          });

    return {
      success: true,
      data: filtered,
    };
  }

  /**
   * GET /borrower/loans
   * Lists borrower loans, optionally filtered by status.
   */
  @Get('loans')
  async getMyLoans(
    @Query('borrowerId') borrowerId?: string,
    @Query('status') status?: LoanStatus,
  ) {
    const id = this.resolveBorrowerId(borrowerId);
    // Optional status narrows the query without changing endpoint shape.
    const loans = await this.borrowerService.getLoans(id, status);

    return {
      success: true,
      data: loans,
    };
  }

  /**
   * GET /borrower/loans/:loanId
   * Returns details for a single borrower-owned loan.
   */
  @Get('loans/:loanId')
  async getLoanDetails(
    @Param('loanId') loanId: string,
    @Query('borrowerId') borrowerId?: string,
  ) {
    const id = this.resolveBorrowerId(borrowerId);
    // Service validates loan ownership before returning details.
    const loan = await this.borrowerService.getLoanById(loanId, id);

    return {
      success: true,
      data: loan,
    };
  }

  /**
   * POST /borrower/loans/filter
   * Applies server-side amount and status filters to borrower loans.
   */
  @Post('loans/filter')
  async filterLoans(
    @Body() filters: Record<string, unknown>,
    @Query('borrowerId') borrowerId?: string,
  ) {
    const id = this.resolveBorrowerId(borrowerId);
    const loans = await this.borrowerService.getLoans(id);
    // Coerce flexible filter payload values into safe numeric bounds.
    const minAmount = Number(
      filters.minAmount ?? BORROWER_FILTER_LIMITS.MIN_AMOUNT,
    );
    const maxAmount = Number(
      filters.maxAmount ?? BORROWER_FILTER_LIMITS.MAX_AMOUNT,
    );
    const status = String(filters.status ?? '').toLowerCase();

    const filtered = loans.filter((loan) => {
      const amountMatch =
        loan.loanAmount >= minAmount && loan.loanAmount <= maxAmount;
      const statusMatch = status ? loan.status === status : true;
      return amountMatch && statusMatch;
    });

    return {
      success: true,
      data: filtered,
    };
  }

  /**
   * GET /borrower/applications
   * Lists borrower loan applications with optional status filtering.
   */
  @Get('applications')
  async getMyApplications(
    @Query('borrowerId') borrowerId?: string,
    @Query('status') status?: LoanApplicationStatus,
  ) {
    const id = this.resolveBorrowerId(borrowerId);
    // Status filter supports list views like drafts, pending, and approved.
    const applications = await this.borrowerService.getLoanApplications(
      id,
      status,
    );

    return {
      success: true,
      data: applications,
    };
  }

  /**
   * GET /borrower/applications/:requestId
   * Returns details for one borrower-owned loan application.
   */
  @Get('applications/:requestId')
  async getApplicationDetails(
    @Param('requestId') requestId: string,
    @Query('borrowerId') borrowerId?: string,
  ) {
    const id = this.resolveBorrowerId(borrowerId);
    const application = await this.borrowerService.getLoanApplicationById(
      requestId,
      id,
    );

    return {
      success: true,
      data: application,
    };
  }

  /**
   * POST /borrower/applications
   * Creates a new loan application draft from mobile payload input.
   */
  @Post('applications')
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
    const id = this.resolveBorrowerId(payload.borrowerId ?? borrowerId);
    // Guard enum parsing to prevent invalid values from breaking application creation.
    const purpose = (payload.purpose ?? 'business').toLowerCase();
    const loanPurpose = (
      Object.values(LoanPurpose).includes(purpose as LoanPurpose)
        ? purpose
        : LoanPurpose.BUSINESS
    ) as LoanPurpose;

    const application = await this.borrowerService.createLoanApplication({
      borrowerId: id,
      adId: payload.adId,
      amount: Number(
        payload.amount ?? BORROWER_DEFAULTS.APPLICATION_AMOUNT,
      ),
      loanPurpose,
      purposeDescription: payload.description,
      tenureMonths: Number(
        payload.tenureMonths ?? BORROWER_DEFAULTS.APPLICATION_TERM_MONTHS,
      ),
      preferredRepaymentMethod:
        (payload.preferredRepaymentMethod as RepaymentMethod) ??
        RepaymentMethod.QR_PAYMENT,
    });

    return {
      success: true,
      data: application,
    };
  }

  /**
   * PUT /borrower/applications/:requestId
   * Updates an existing borrower loan application.
   */
  @Put('applications/:requestId')
  async updateApplication(
    @Param('requestId') requestId: string,
    @Body() payload: Record<string, unknown>,
    @Query('borrowerId') borrowerId?: string,
  ) {
    const id = this.resolveBorrowerId(borrowerId);
    // Map mobile payload keys to backend update DTO fields.
    const application = await this.borrowerService.updateLoanApplication(
      requestId,
      id,
      {
        amount: payload.amount as number | undefined,
        purposeDescription: payload.description as string | undefined,
        tenureMonths: payload.tenureMonths as number | undefined,
      },
    );

    return {
      success: true,
      data: application,
    };
  }

  @Post('applications/:requestId/submit')
  async submitApplication(
    @Param('requestId') requestId: string,
    @Query('borrowerId') borrowerId?: string,
  ) {
    const id = this.resolveBorrowerId(borrowerId);
    const application = await this.borrowerService.submitLoanApplication(
      requestId,
      id,
    );

    return {
      success: true,
      data: application,
    };
  }

  /**
   * DELETE /borrower/applications/:requestId
   * Deletes a borrower loan application (draft-only in service layer).
   */
  @Delete('applications/:requestId')
  async deleteApplication(
    @Param('requestId') requestId: string,
    @Query('borrowerId') borrowerId?: string,
  ) {
    const id = this.resolveBorrowerId(borrowerId);
    // Delete is allowed only for draft applications (enforced in service).
    const result = await this.borrowerService.deleteLoanApplication(
      requestId,
      id,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /borrower/payments
   * Returns a unified payment history built from all borrower loans.
   */
  @Get('payments')
  async getMyPayments(@Query('borrowerId') borrowerId?: string) {
    const id = this.resolveBorrowerId(borrowerId);
    const loans = await this.borrowerService.getLoans(id);

    // Batch-fetch real lender names
    const lenderIds = loans.map((l) => l.lenderId);
    const lenderNames = await this.borrowerService.getLenderNamesMap(lenderIds);

    // Aggregate repayment history per-loan — catch per-loan errors so one bad loan
    // doesn't prevent the full list from returning.
    const histories = await Promise.all(
      loans.map((loan) =>
        this.borrowerService
          .getRepaymentHistory(loan.loanId, id)
          .catch(() => [] as any[]),
      ),
    );

    const repayments = histories.flat();

    // Build upcoming payment stubs from active loans with outstanding balance.
    const upcomingPayments = loans
      .filter((l) => l.status === 'active' && l.outstandingBalance > 0)
      .map((l) => {
        const rawDate = l.nextPaymentDate as any;
        const dueDate = rawDate?.toDate ? rawDate.toDate().toISOString() : rawDate ?? null;
        return {
          paymentId: `upcoming-${l.loanId}`,
          loanId: l.loanId,
          amount: l.monthlyInstallment,
          status: 'PENDING',
          dueDate,
          lenderName: lenderNames.get(l.lenderId) ?? 'Lender',
        };
      });

    // Sort upcoming payments ascending (earliest due date first)
    upcomingPayments.sort((a, b) => {
      const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aTime - bTime;
    });

    return {
      success: true,
      data: [...upcomingPayments, ...repayments],
    };
  }

  /**
   * POST /borrower/payments
   * Creates a repayment record for a borrower loan.
   */
  @Post('payments')
  async createPayment(
    @Body()
    payload: {
      loanId: string;
      amount?: number;
      paymentMethod?: RepaymentMethod;
      transactionReference?: string;
      paymentProofUrl?: string;
      borrowerId?: string;
    },
    @Query('borrowerId') borrowerId?: string,
  ) {
    const id = this.resolveBorrowerId(payload.borrowerId ?? borrowerId);
    // Apply safe defaults so test/demo flows can submit repayments quickly.
    const repayment = await this.borrowerService.makeRepayment({
      loanId: payload.loanId,
      borrowerId: id,
      amount: Number(payload.amount ?? BORROWER_DEFAULTS.REPAYMENT_AMOUNT),
      paymentMethod: payload.paymentMethod ?? RepaymentMethod.QR_PAYMENT,
      transactionReference: payload.transactionReference,
      paymentProofUrl: payload.paymentProofUrl,
    });

    return {
      success: true,
      data: repayment,
    };
  }

  /**
   * POST /borrower/payments/generate-qr
   * Generates a temporary QR token payload for repayment flow.
   */
  @Post('payments/generate-qr')
  async generateQr(
    @Body() payload: { loanId: string; borrowerId?: string },
    @Query('borrowerId') borrowerId?: string,
  ) {
    const id = this.resolveBorrowerId(payload.borrowerId ?? borrowerId);

    return {
      success: true,
      data: {
        borrowerId: id,
        loanId: payload.loanId,
        // Temporary QR token generation until integrated with a payment provider.
        qrCode: `${BORROWER_FLOW.QR_CODE_PREFIX}-${payload.loanId}-${Date.now()}`,
      },
    };
  }

  /**
   * POST /borrower/payments/upload-receipt
   * Accepts receipt metadata and returns a temporary stub response.
   */
  @Post('payments/upload-receipt')
  async uploadReceipt(@Body() payload: Record<string, unknown>) {
    return {
      success: true,
      data: {
        // Stub response until file storage integration is implemented.
        uploaded: true,
        ...payload,
      },
    };
  }

  /**
   * GET /borrower/transactions
   * Returns transaction-shaped records derived from repayments.
   */
  @Get('transactions')
  async getMyTransactions(@Query('borrowerId') borrowerId?: string) {
    const id = this.resolveBorrowerId(borrowerId);
    const loans = await this.borrowerService.getLoans(id);

    // Batch-fetch real lender names
    const lenderIds = loans.map((l) => l.lenderId);
    const lenderNames = await this.borrowerService.getLenderNamesMap(lenderIds);

    // Flatten repayment histories and remap them to transaction response shape.
    const histories = await Promise.all(
      loans.map((loan) =>
        this.borrowerService.getRepaymentHistory(loan.loanId, id),
      ),
    );

    const repaymentTransactions = histories.flat().map((repayment) => {
      const loan = loans.find((l) => l.loanId === repayment.loanId);
      return {
        transactionId: repayment.repaymentId,
        loanId: repayment.loanId,
        amount: repayment.amount,
        status: repayment.status,
        paidAt: repayment.paidAt,
        createdAt: repayment.createdAt,
        type: 'repayment',
        lenderName: lenderNames.get(loan?.lenderId ?? '') ?? 'Lender',
      };
    });

    const disbursementTransactions = loans
      .filter((loan) => loan.startDate)
      .map((loan) => ({
        transactionId: loan.loanId,
        loanId: loan.loanId,
        amount: loan.loanAmount,
        status: 'COMPLETED',
        paidAt: loan.startDate,
        createdAt: loan.createdAt,
        type: 'disbursement',
        lenderName: lenderNames.get(loan.lenderId) ?? 'Lender',
      }));

    const transactions = [...repaymentTransactions, ...disbursementTransactions];

    transactions.sort((a, b) => {
      const timeA = a.paidAt ? (typeof (a.paidAt as any).toMillis === 'function' ? (a.paidAt as any).toMillis() : (a.paidAt instanceof Date ? a.paidAt.getTime() : 0)) : 0;
      const timeB = b.paidAt ? (typeof (b.paidAt as any).toMillis === 'function' ? (b.paidAt as any).toMillis() : (b.paidAt instanceof Date ? b.paidAt.getTime() : 0)) : 0;
      return timeB - timeA;
    });

    return {
      success: true,
      data: transactions,
    };
  }

  /**
   * GET /borrower/transactions/:transactionId
   * Returns one transaction from the borrower transaction list.
   */
  @Get('transactions/:transactionId')
  async getTransactionDetails(
    @Param('transactionId') transactionId: string,
    @Query('borrowerId') borrowerId?: string,
  ) {
    // Reuse the normalized transaction list and select by transaction id.
    const list = await this.getMyTransactions(borrowerId);
    const transaction = (list.data as Array<Record<string, unknown>>).find(
      (item) => item.transactionId === transactionId,
    );

    return {
      success: true,
      data: transaction ?? null,
    };
  }

  /**
   * GET /borrower/credit-score
   * Returns the borrower credit score summary for widgets.
   */
  @Get('credit-score')
  async getCreditScore(@Query('borrowerId') borrowerId?: string) {
    const id = this.resolveBorrowerId(borrowerId);
    const profile = await this.borrowerService.getProfile(id);

    return {
      success: true,
      data: {
        // Keep credit response minimal for score widgets.
        score: profile.creditScore,
        kycVerified: profile.kycVerified,
        profileComplete: profile.profileComplete,
      },
    };
  }

  /**
   * GET /borrower/credit-score/history
   * Returns monthly credit score trend data for chart rendering.
   */
  @Get('credit-score/history')
  async getCreditScoreHistory(@Query('borrowerId') borrowerId?: string) {
    const id = this.resolveBorrowerId(borrowerId);
    const profile = await this.borrowerService.getProfile(id);

    // Synthetic trend data used for dashboard visualization.
    const history = BORROWER_DEFAULTS.CREDIT_HISTORY_OFFSETS.map(
      (decrease, index) => ({
        month: `2026-0${index + 2}`,
        score: Math.max(
          BORROWER_DEFAULTS.STARTING_CREDIT_SCORE,
          profile.creditScore - decrease,
        ),
      }),
    );

    return {
      success: true,
      data: history,
    };
  }

  /**
   * GET /borrower/support/status
   * Returns current support ticket statuses for the borrower.
   */
  @Get('support/status')
  async getSupportStatus(@Query('borrowerId') borrowerId?: string) {
    const id = this.resolveBorrowerId(borrowerId);
    return {
      success: true,
      data: await this.borrowerService.getSupportStatus(id),
    };
  }
}
