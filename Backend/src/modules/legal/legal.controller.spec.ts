import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { LegalController } from './legal.controller';
import { LegalService } from './legal.service';

describe('LegalController', () => {
  let controller: LegalController;
  let legalService: {
    generateLoanAgreement: jest.Mock;
    getDocumentById: jest.Mock;
    getLatestLoanDocument: jest.Mock;
    acceptDocument: jest.Mock;
    downloadDocumentPdf: jest.Mock;
  };
  let jwtService: {
    verifyAsync: jest.Mock;
  };

  beforeEach(async () => {
    legalService = {
      generateLoanAgreement: jest.fn(),
      getDocumentById: jest.fn(),
      getLatestLoanDocument: jest.fn(),
      acceptDocument: jest.fn(),
      downloadDocumentPdf: jest.fn(),
    };
    jwtService = {
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LegalController],
      providers: [
        {
          provide: LegalService,
          useValue: legalService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    controller = module.get<LegalController>(LegalController);
  });

  it('delegates document generation to the service with the authenticated user', async () => {
    const req = {
      user: {
        sub: 'borrower-1',
        email: 'borrower@example.com',
        role: 'borrower',
      },
    } as AuthenticatedRequest;

    await controller.generateLoanAgreement('loan-1', req);

    expect(legalService.generateLoanAgreement).toHaveBeenCalledWith(
      'loan-1',
      'borrower-1',
      'borrower',
    );
  });

  it('delegates document reads and acceptance to the service', async () => {
    const req = {
      user: {
        sub: 'lender-1',
        email: 'lender@example.com',
        role: 'lender',
      },
    } as AuthenticatedRequest;

    await controller.getDocumentById('doc-1', req);
    await controller.getLatestLoanDocument('loan-1', req);
    await controller.acceptDocument('doc-1', req, {
      signedName: 'Lender User',
    });

    expect(legalService.getDocumentById).toHaveBeenCalledWith(
      'doc-1',
      'lender-1',
      'lender',
    );
    expect(legalService.getLatestLoanDocument).toHaveBeenCalledWith(
      'loan-1',
      'lender-1',
      'lender',
    );
    expect(legalService.acceptDocument).toHaveBeenCalledWith(
      'doc-1',
      'lender-1',
      'lender',
      expect.objectContaining({
        signedName: 'Lender User',
      }),
    );
  });

  it('downloads a legal document pdf using the verified token', async () => {
    const req = {
      headers: {},
    } as Request;
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as unknown as Response;
    const pdfBuffer = Buffer.from('pdf');

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'borrower-1',
      email: 'borrower@example.com',
      role: 'borrower',
    });
    legalService.downloadDocumentPdf.mockResolvedValue({
      buffer: pdfBuffer,
      fileName: 'agreement.pdf',
    });

    await controller.downloadDocumentPdf('doc-9', req, res, 'token-123');

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('token-123');
    expect(legalService.downloadDocumentPdf).toHaveBeenCalledWith(
      'doc-9',
      'borrower-1',
      'borrower',
    );
  });
});
