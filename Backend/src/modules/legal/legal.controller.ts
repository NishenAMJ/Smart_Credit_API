import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type {
  AcceptLegalDocumentDto,
  AcceptLegalDocumentResponseDto,
  ConfirmAgreementDisbursementDto,
  GenerateLegalDocumentResponseDto,
  GetLegalDocumentResponseDto,
  ListLegalDocumentsResponseDto,
} from './dto/legal-document.dto';
import { LegalService } from './legal.service';

@Controller('legal')
@UseGuards(JwtAuthGuard)
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  @Post('documents/generate/:loanId')
  async generateLoanAgreement(
    @Param('loanId') loanId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<GenerateLegalDocumentResponseDto> {
    const document = await this.legalService.generateLoanAgreement(
      loanId,
      request.user.sub,
      request.user.role,
    );
    return { message: 'Loan agreement is ready.', document };
  }

  @Get('documents')
  async listDocuments(
    @Req() request: AuthenticatedRequest,
    @Query('pageSize') pageSize?: string,
    @Query('cursor') cursor?: string,
    @Query('status') status?: string,
  ): Promise<ListLegalDocumentsResponseDto> {
    return this.legalService.listDocuments(
      request.user.sub,
      request.user.role,
      {
        pageSize: pageSize ? Number(pageSize) : undefined,
        cursor: cursor?.trim() || undefined,
        status: status?.trim() || undefined,
      },
    );
  }

  @Get('documents/loan/:loanId/latest')
  async getLatestLoanDocument(
    @Param('loanId') loanId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<GetLegalDocumentResponseDto> {
    const document = await this.legalService.getLatestLoanDocument(
      loanId,
      request.user.sub,
      request.user.role,
    );
    return { document };
  }

  @Get('documents/:documentId')
  async getDocumentById(
    @Param('documentId') documentId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<GetLegalDocumentResponseDto> {
    const document = await this.legalService.getDocumentById(
      documentId,
      request.user.sub,
      request.user.role,
    );
    return { document };
  }

  @Post('documents/:documentId/accept')
  acceptDocument(
    @Param('documentId') documentId: string,
    @Req() request: AuthenticatedRequest,
    @Body() body: AcceptLegalDocumentDto,
  ): Promise<AcceptLegalDocumentResponseDto> {
    return this.legalService.acceptDocument(
      documentId,
      request.user.sub,
      request.user.role,
      {
        signedName: body.signedName,
        consentAccepted: body.consentAccepted,
        agreementVersion: body.agreementVersion,
        termsHash: body.termsHash,
        fundsReceivedConfirmed: body.fundsReceivedConfirmed,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      },
    );
  }

  @Post('documents/:documentId/disbursement-confirmation')
  confirmDisbursement(
    @Param('documentId') documentId: string,
    @Req() request: AuthenticatedRequest,
    @Body() body: ConfirmAgreementDisbursementDto,
  ): Promise<AcceptLegalDocumentResponseDto> {
    return this.legalService.confirmDisbursement(
      documentId,
      request.user.sub,
      request.user.role,
      {
        confirmationAccepted: body.confirmationAccepted,
        externalReference: body.externalReference,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      },
    );
  }

  @Post('documents/:documentId/finalize')
  retryFinalization(
    @Param('documentId') documentId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<AcceptLegalDocumentResponseDto> {
    return this.legalService.retryFinalization(
      documentId,
      request.user.sub,
      request.user.role,
    );
  }

  @Get('documents/:documentId/download')
  async downloadDocumentPdf(
    @Param('documentId') documentId: string,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ): Promise<void> {
    const pdf = await this.legalService.downloadDocumentPdf(
      documentId,
      request.user.sub,
      request.user.role,
    );
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${pdf.fileName}"`,
    );
    response.setHeader('Content-Length', String(pdf.buffer.length));
    response.send(pdf.buffer);
  }
}
