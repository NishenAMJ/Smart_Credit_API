import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';

import { FirebaseService } from '../../firebase/firebase.service';
import { AuthService } from '../auth/auth.service';
import type { UserDocument } from '../auth/auth.types';
import { LegalService } from './legal.service';
import type { LegalDocument } from './legal.types';

describe('LegalService', () => {
  let service: LegalService;
  let legalDocs: LegalDocument[];
  let loans: Record<string, Record<string, unknown>>;
  let users: Record<string, UserDocument>;
  let storedFiles: Record<string, Buffer>;

  function buildUser(
    uid: string,
    role: 'borrower' | 'lender' | 'admin',
  ): UserDocument {
    return {
      uid,
      role: [role],
      fullName: `${role} user`,
      photoURL: '',
      phone: '+947700000000',
      email: `${role}@example.com`,
      emailLower: `${role}@example.com`,
      phoneNormalized: '+947700000000',
      passwordHash: 'hash',
      creditScore: 0,
      rating: 0,
      totalLoansCompleted: 0,
      totalAmountLent: 0,
      totalAmountBorrowed: 0,
      kycStatus: 'approved',
      accountStatus: 'active',
      authProvider: 'local',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }

  beforeEach(() => {
    legalDocs = [];
    storedFiles = {};
    loans = {
      'loan-1': {
        borrowerId: 'borrower-1',
        lenderId: 'lender-1',
        amount: 250000,
        interestRate: 18,
        durationMonths: 12,
        repaymentSchedule: 'Monthly',
        status: 'active',
      },
    };
    users = {
      'borrower-1': buildUser('borrower-1', 'borrower'),
      'lender-1': buildUser('lender-1', 'lender'),
      'admin-1': buildUser('admin-1', 'admin'),
    };

    const firebaseService = {
      db: {
        collection: jest.fn((name: string) => {
          if (name === 'loans') {
            return {
              doc: jest.fn((loanId: string) => ({
                get: jest.fn(async () => ({
                  exists: Boolean(loans[loanId]),
                  id: loanId,
                  data: () => loans[loanId],
                })),
              })),
            };
          }

          if (name === 'legalDocuments') {
            return {
              doc: jest.fn((documentId?: string) => {
                const id = documentId ?? `legal-${legalDocs.length + 1}`;
                return {
                  id,
                  set: jest.fn(async (payload: LegalDocument) => {
                    const index = legalDocs.findIndex((item) => item.id === id);
                    if (index >= 0) {
                      legalDocs[index] = payload;
                    } else {
                      legalDocs.push(payload);
                    }
                  }),
                  get: jest.fn(async () => {
                    const document = legalDocs.find((item) => item.id === id);
                    return {
                      exists: Boolean(document),
                      data: () => document,
                    };
                  }),
                  update: jest.fn(async (payload: Partial<LegalDocument>) => {
                    const index = legalDocs.findIndex((item) => item.id === id);
                    legalDocs[index] = {
                      ...legalDocs[index],
                      ...payload,
                    } as LegalDocument;
                  }),
                };
              }),
              where: jest.fn((_field: string, _op: string, loanId: string) => ({
                get: jest.fn(async () => ({
                  empty:
                    legalDocs.filter((item) => item.loanId === loanId)
                      .length === 0,
                  docs: legalDocs
                    .filter((item) => item.loanId === loanId)
                    .map((item) => ({
                      data: () => item,
                    })),
                })),
              })),
            };
          }

          return {};
        }),
      },
      bucket: {
        file: jest.fn((path: string) => ({
          save: jest.fn(async (buffer: Buffer) => {
            storedFiles[path] = buffer;
          }),
          exists: jest.fn(async () => [Boolean(storedFiles[path])]),
          download: jest.fn(async () => [storedFiles[path]]),
        })),
      },
    } as unknown as FirebaseService;

    const authService = {
      getUserById: jest.fn(async (userId: string) => {
        if (!users[userId]) {
          throw new NotFoundException('User not found.');
        }
        return users[userId];
      }),
    } as unknown as AuthService;

    service = new LegalService(firebaseService, authService);
  });

  it('generates a legal document from a loan record', async () => {
    const document = await service.generateLoanAgreement(
      'loan-1',
      'borrower-1',
      'borrower',
    );

    expect(document.loanId).toBe('loan-1');
    expect(document.borrower.userId).toBe('borrower-1');
    expect(document.lender.userId).toBe('lender-1');
    expect(document.status).toBe('generated');
    expect(document.htmlContent).toContain('Smart Credit+ Loan Agreement');
  });

  it('prevents unrelated users from accessing loan agreements', async () => {
    await expect(
      service.generateLoanAgreement('loan-1', 'admin-1', 'borrower'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('records acceptance and upgrades the document status', async () => {
    const generated = await service.generateLoanAgreement(
      'loan-1',
      'borrower-1',
      'borrower',
    );

    const borrowerAccepted = await service.acceptDocument(
      generated.id,
      'borrower-1',
      'borrower',
      { signedName: 'Borrower User' },
    );
    const lenderAccepted = await service.acceptDocument(
      generated.id,
      'lender-1',
      'lender',
      { signedName: 'Lender User' },
    );

    expect(borrowerAccepted.document.status).toBe('partially_accepted');
    expect(lenderAccepted.document.status).toBe('fully_accepted');
    expect(lenderAccepted.document.signedPdfStoragePath).toContain(
      'legal-documents/loan-1/',
    );
  });

  it('downloads the stored signed pdf when it exists', async () => {
    const generated = await service.generateLoanAgreement(
      'loan-1',
      'borrower-1',
      'borrower',
    );

    await service.acceptDocument(generated.id, 'borrower-1', 'borrower', {
      signedName: 'Borrower User',
    });
    const accepted = await service.acceptDocument(
      generated.id,
      'lender-1',
      'lender',
      { signedName: 'Lender User' },
    );

    const result = await service.downloadDocumentPdf(
      accepted.document.id,
      'borrower-1',
      'borrower',
    );

    expect(result.fileName).toContain('loan-1');
    expect(result.buffer.length).toBeGreaterThan(0);
  });
});
