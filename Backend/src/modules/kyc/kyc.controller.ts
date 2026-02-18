import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { KycService } from './kyc.service';
import { ApproveKycDto } from './dto/approve-kyc.dto';
import { RejectKycDto } from './dto/reject-kyc.dto';

@Controller('admin/kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Get('pending')
  async getPendingKyc() {
    return this.kycService.getPendingKyc();
  }

  @Get(':userId/documents')
  async getUserDocuments(@Param('userId') userId: string) {
    return this.kycService.getUserDocuments(userId);
  }

  @Post(':documentId/approve')
  @HttpCode(HttpStatus.OK)
  async approveDocument(
    @Param('documentId') documentId: string,
    @Body() dto: ApproveKycDto,
  ) {
    return this.kycService.approveDocument(documentId, dto.notes);
  }

  @Post(':documentId/reject')
  @HttpCode(HttpStatus.OK)
  async rejectDocument(
    @Param('documentId') documentId: string,
    @Body() dto: RejectKycDto,
  ) {
    return this.kycService.rejectDocument(documentId, dto.reason);
  }
}
