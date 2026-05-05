import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { KycService } from './kyc.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';

@Controller('kyc')
export class KycMobileController {
  constructor(private readonly kycService: KycService) {}

  // Accepts the mobile app's profile photo and KYC document payloads for a new or existing user.
  @Post('submit')
  @UseGuards(JwtAuthGuard)
  async submit(@Body() dto: SubmitKycDto, @Req() req: AuthenticatedRequest) {
    return this.kycService.submitMobileKyc(dto, req.user.sub);
  }

  // Returns the authenticated user's own uploaded KYC documents.
  @Get('documents')
  @UseGuards(JwtAuthGuard)
  async listMyDocuments(@Req() req: AuthenticatedRequest) {
    return this.kycService.getUserDocuments(req.user.sub);
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
