import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { KycService } from './kyc.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { ResubmitKycDto } from './dto/resubmit-kyc.dto';

@Controller('kyc')
export class KycMobileController {
  constructor(private readonly kycService: KycService) {}

  // Accepts the mobile app's profile photo and KYC document payloads for a new or existing user.
  @Post('submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('borrower', 'lender')
  async submit(@Body() dto: SubmitKycDto, @Req() req: AuthenticatedRequest) {
    return this.kycService.submitMobileKyc(dto, req.user.sub, req.user.role);
  }

  // Allows a signed-in user to replace rejected files without creating a new account.
  @Post('resubmit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('borrower', 'lender')
  async resubmit(
    @Body() dto: ResubmitKycDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.kycService.resubmitRejectedKyc(
      req.user.sub,
      req.user.role,
      dto,
    );
  }

  // Returns the authenticated user's own uploaded KYC documents.
  @Get('documents')
  @UseGuards(JwtAuthGuard)
  async listMyDocuments(@Req() req: AuthenticatedRequest) {
    return this.kycService.getUserDocuments(req.user.sub);
  }

  // Returns the canonical user-level KYC state expected by mobile session restoration.
  @Get('my-submission')
  @UseGuards(JwtAuthGuard)
  async getMySubmission(@Req() req: AuthenticatedRequest) {
    return this.kycService.getMySubmission(req.user.sub);
  }

  // Generates a time-limited access URL so the owner can view a stored KYC file securely.
  @Get('documents/:documentId/access')
  @UseGuards(JwtAuthGuard)
  async getDocumentAccessUrl(
    @Param('documentId') documentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.kycService.getSignedDocumentAccessUrl(
      documentId,
      req.user.sub,
      req.user.role,
    );
  }
}
