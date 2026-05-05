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
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Response, Request } from 'express';

import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import type { AuthenticatedUser } from '../../common/types/authenticated-request';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LegalService } from './legal.service';
import type {
  AcceptLegalDocumentResponseDto,
  AcceptLegalDocumentDto,
  GenerateLegalDocumentResponseDto,
  GetLegalDocumentResponseDto,
  ListLegalDocumentsResponseDto,
} from './dto/legal-document.dto';

@Controller('legal')
export class LegalController {
  constructor(
    private readonly legalService: LegalService,
    private readonly jwtService: JwtService,
  ) {}

  // Generates or refreshes the latest agreement document for a loan the user can access.
  @Post('documents/generate/:loanId')
  @UseGuards(JwtAuthGuard)
  async generateLoanAgreement(
    @Param('loanId') loanId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<GenerateLegalDocumentResponseDto> {
    const document = await this.legalService.generateLoanAgreement(
      loanId,
      req.user.sub,
      req.user.role,
    );

    return {
      message: 'Loan agreement generated successfully.',
      document,
    };
  }

  // Lists legal documents visible to the authenticated borrower, lender, or admin.
  @Get('documents')
  @UseGuards(JwtAuthGuard)
  async listDocuments(
    @Req() req: AuthenticatedRequest,
  ): Promise<ListLegalDocumentsResponseDto> {
    const documents = await this.legalService.listDocuments(
      req.user.sub,
      req.user.role,
    );

    return { documents };
  }

  // Fetches one legal document after checking role-based ownership access.
  @Get('documents/:documentId')
  @UseGuards(JwtAuthGuard)
  async getDocumentById(
    @Param('documentId') documentId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<GetLegalDocumentResponseDto> {
    const document = await this.legalService.getDocumentById(
      documentId,
      req.user.sub,
      req.user.role,
    );

    return { document };
  }

  // Returns the newest agreement document generated for a specific loan.
  @Get('documents/loan/:loanId/latest')
  @UseGuards(JwtAuthGuard)
  async getLatestLoanDocument(
    @Param('loanId') loanId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<GetLegalDocumentResponseDto> {
    const document = await this.legalService.getLatestLoanDocument(
      loanId,
      req.user.sub,
      req.user.role,
    );

    return { document };
  }

  // Records a party's acceptance details and signature audit metadata.
  @Post('documents/:documentId/accept')
  @UseGuards(JwtAuthGuard)
  async acceptDocument(
    @Param('documentId') documentId: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: AcceptLegalDocumentDto,
  ): Promise<AcceptLegalDocumentResponseDto> {
    return this.legalService.acceptDocument(
      documentId,
      req.user.sub,
      req.user.role,
      {
        signedName: body.signedName,
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'],
      },
    );
  }

<<<<<<< HEAD
  @Get('documents/:documentId/pdf-access')
  @UseGuards(JwtAuthGuard)
  async getSignedPdfAccessUrl(
    @Param('documentId') documentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.legalService.getSignedPdfAccessUrl(
      documentId,
      req.user.sub,
      req.user.role,
    );
  }

=======
  // Streams the agreement PDF after resolving the user from either a bearer token or query token.
>>>>>>> f77b41fe (add comments)
  @Get('documents/:documentId/download')
  async downloadDocumentPdf(
    @Param('documentId') documentId: string,
    @Req() req: Request,
    @Res() res: Response,
    @Query('token') token?: string,
  ): Promise<void> {
    const user = await this.resolveAuthenticatedUser(req, token);
    const { buffer, fileName } = await this.legalService.downloadDocumentPdf(
      documentId,
      user.sub,
      user.role,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);
  }

  // Supports both browser downloads with a token query param and API requests with Authorization headers.
  private async resolveAuthenticatedUser(
    req: Request,
    token?: string,
  ): Promise<AuthenticatedUser> {
    const bearerToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice('Bearer '.length)
      : '';
    const accessToken = token || bearerToken;

    if (!accessToken) {
      throw new UnauthorizedException('Authentication token is required.');
    }

    try {
      return await this.jwtService.verifyAsync<AuthenticatedUser>(accessToken);
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired authentication token.',
      );
    }
  }
}
