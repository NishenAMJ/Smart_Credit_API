import { Test, type TestingModule } from '@nestjs/testing';
import type { Response } from 'express';

import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { LegalController } from './legal.controller';
import { LegalService } from './legal.service';

describe('LegalController', () => {
  let controller: LegalController;
  let legalService: Record<string, jest.Mock>;

  beforeEach(async () => {
    legalService = {
      generateLoanAgreement: jest.fn(),
      listDocuments: jest.fn(),
      getDocumentById: jest.fn(),
      getLatestLoanDocument: jest.fn(),
      acceptDocument: jest.fn(),
      confirmDisbursement: jest.fn(),
      retryFinalization: jest.fn(),
      downloadDocumentPdf: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LegalController],
      providers: [{ provide: LegalService, useValue: legalService }],
    }).compile();
    controller = module.get(LegalController);
  });

  it('records transfer confirmation using only the authenticated lender identity', async () => {
    const body = {
      confirmationAccepted: true,
      externalReference: 'BANK-123',
    };
    await controller.confirmDisbursement(
      'agreement-1',
      request('lender'),
      body,
    );

    expect(legalService.confirmDisbursement).toHaveBeenCalledWith(
      'agreement-1',
      'lender-1',
      'lender',
      expect.objectContaining({
        ...body,
        ipAddress: '127.0.0.1',
        userAgent: 'jest-agent',
      }),
    );
  });

  function request(role: 'borrower' | 'lender' | 'admin') {
    return {
      user: { sub: `${role}-1`, email: `${role}@example.com`, role },
      headers: { 'user-agent': 'jest-agent' },
      ip: '127.0.0.1',
    } as AuthenticatedRequest;
  }

  it('uses only the authenticated JWT identity for generation and reads', async () => {
    await controller.generateLoanAgreement('loan-1', request('lender'));
    await controller.getLatestLoanDocument('loan-1', request('borrower'));

    expect(legalService.generateLoanAgreement).toHaveBeenCalledWith(
      'loan-1',
      'lender-1',
      'lender',
    );
    expect(legalService.getLatestLoanDocument).toHaveBeenCalledWith(
      'loan-1',
      'borrower-1',
      'borrower',
    );
  });

  it('forwards explicit consent, agreement version and terms hash', async () => {
    const body = {
      signedName: 'Lender Legal Name',
      consentAccepted: true,
      agreementVersion: 2,
      termsHash: 'a'.repeat(64),
    };
    await controller.acceptDocument('agreement-1', request('lender'), body);

    expect(legalService.acceptDocument).toHaveBeenCalledWith(
      'agreement-1',
      'lender-1',
      'lender',
      expect.objectContaining({
        ...body,
        ipAddress: '127.0.0.1',
        userAgent: 'jest-agent',
      }),
    );
  });

  it('streams downloads using the guarded request identity, never a query token', async () => {
    const response = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as unknown as Response;
    legalService.downloadDocumentPdf.mockResolvedValue({
      buffer: Buffer.from('pdf'),
      fileName: 'agreement.pdf',
    });

    await controller.downloadDocumentPdf(
      'agreement-1',
      request('admin'),
      response,
    );

    expect(legalService.downloadDocumentPdf).toHaveBeenCalledWith(
      'agreement-1',
      'admin-1',
      'admin',
    );
    expect(response.send).toHaveBeenCalledWith(Buffer.from('pdf'));
  });
});
