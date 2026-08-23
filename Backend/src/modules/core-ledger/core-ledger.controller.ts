import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type {
  ApproveApplicationInput,
  SettleInstallmentInput,
} from './core-ledger.service';
import { CoreLedgerService } from './core-ledger.service';

@Controller('ledger')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoreLedgerController {
  constructor(private readonly coreLedgerService: CoreLedgerService) {}

  @Post('applications/:applicationId/convert')
  @Roles('lender')
  convertApplication(
    @Req() request: AuthenticatedRequest,
    @Param('applicationId') applicationId: string,
    @Body() input: ApproveApplicationInput,
  ) {
    return this.coreLedgerService.approveApplication(
      applicationId,
      request.user.sub,
      input,
    );
  }

  @Post('loans/:loanId/installments/:installmentId/settle')
  @Roles('borrower')
  settleInstallment(
    @Req() request: AuthenticatedRequest,
    @Param('loanId') loanId: string,
    @Param('installmentId') installmentId: string,
    @Body() input: SettleInstallmentInput,
  ) {
    return this.coreLedgerService.settleInstallment(
      loanId,
      installmentId,
      request.user.sub,
      input,
    );
  }
}
