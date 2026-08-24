import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';

import type { UserDocument } from '../auth/auth.types';
import { LegalService } from './legal.service';

type StoredRecord = Record<string, unknown>;

function createMemoryFirestore(initial: Record<string, StoredRecord>) {
  const records = new Map(Object.entries(initial));
  let autoId = 0;

  const snapshot = (path: string) => ({
    id: path.split('/').at(-1),
    exists: records.has(path),
    data: () => records.get(path),
    get: (field: string) => records.get(path)?.[field],
  });

  const doc = (path: string) => {
    const reference: any = {
      id: path.split('/').at(-1),
      path,
      get: jest.fn(async () => snapshot(path)),
      set: jest.fn(async (value: StoredRecord) => records.set(path, value)),
      update: jest.fn(async (value: StoredRecord) => {
        records.set(path, { ...(records.get(path) ?? {}), ...value });
      }),
      collection: (name: string) => collection(`${path}/${name}`),
    };
    return reference;
  };

  const collection = (path: string) => {
    const filters: Array<[string, unknown]> = [];
    let maximum = Number.POSITIVE_INFINITY;
    const query: any = {
      doc: (id?: string) => doc(`${path}/${id ?? `auto_${++autoId}`}`),
      add: jest.fn(async (value: StoredRecord) => {
        const reference = doc(`${path}/auto_${++autoId}`);
        records.set(reference.path, value);
        return reference;
      }),
      where: (field: string, _operator: string, value: unknown) => {
        filters.push([field, value]);
        return query;
      },
      orderBy: () => query,
      startAfter: () => query,
      limit: (value: number) => {
        maximum = value;
        return query;
      },
      get: jest.fn(async () => {
        const depth = path.split('/').length + 1;
        const docs = [...records.entries()]
          .filter(([key, value]) => {
            if (!key.startsWith(`${path}/`) || key.split('/').length !== depth) {
              return false;
            }
            return filters.every(([field, expected]) => value[field] === expected);
          })
          .sort((left, right) => {
            const leftVersion = Number(left[1].version ?? 0);
            const rightVersion = Number(right[1].version ?? 0);
            return rightVersion - leftVersion;
          })
          .slice(0, maximum)
          .map(([key]) => snapshot(key));
        return { empty: docs.length === 0, docs, size: docs.length };
      }),
    };
    return query;
  };

  const db: any = {
    collection,
    runTransaction: jest.fn(async (work: (transaction: any) => unknown) =>
      work({
        get: async (reference: any) => snapshot(reference.path),
        set: (reference: any, value: StoredRecord) =>
          records.set(reference.path, value),
        create: (reference: any, value: StoredRecord) => {
          if (records.has(reference.path)) throw new Error('already exists');
          records.set(reference.path, value);
        },
        update: (reference: any, value: StoredRecord) => {
          records.set(reference.path, {
            ...(records.get(reference.path) ?? {}),
            ...value,
          });
        },
      }),
    ),
  };
  return { db, records };
}

function user(userId: string, role: 'borrower' | 'lender'): UserDocument {
  const now = Timestamp.now();
  return {
    userId,
    roles: [role],
    fullName: role === 'borrower' ? 'Borrower User' : 'Lender User',
    photoUrl: null,
    phone: role === 'borrower' ? '+94770000001' : '+94770000002',
    email: `${role}@example.com`,
    borrowerProfile: role === 'borrower' ? {
      dateOfBirth: null,
      occupation: null,
      monthlyIncomeMinor: null,
      creditScore: 700,
    } : null,
    lenderProfile: role === 'lender' ? {
      businessName: 'Lender Business',
      registrationNumber: null,
      description: null,
      rating: 0,
    } : null,
    kycStatus: 'approved',
    accountStatus: 'active',
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };
}

describe('LegalService', () => {
  let service: LegalService;
  let records: Map<string, StoredRecord>;
  let mediaService: { uploadBufferAsDocument: jest.Mock; generateSignedDeliveryUrl: jest.Mock };
  let documentsService: { createSystemGeneratedRecord: jest.Mock; getById: jest.Mock };
  let gateway: { emitToUser: jest.Mock };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    const memory = createMemoryFirestore({
      'loans/loan-1': {
        loanId: 'loan-1',
        applicationId: 'application-1',
        listingId: 'listing-1',
        borrowerId: 'borrower-1',
        lenderId: 'lender-1',
        currency: 'LKR',
        principalMinor: 1_200_000,
        annualInterestRate: 12,
        interestAmountMinor: 144_000,
        totalRepayableMinor: 1_344_000,
        monthlyInstallmentMinor: 112_000,
        tenureMonths: 12,
        status: 'pending_disbursement',
        termsVersion: 1,
      },
    });
    records = memory.records;
    const users: Record<string, UserDocument> = {
      'borrower-1': user('borrower-1', 'borrower'),
      'lender-1': user('lender-1', 'lender'),
    };
    mediaService = {
      uploadBufferAsDocument: jest.fn(async () => ({
        assetId: 'asset-1',
        publicId: 'documents/loan-1/signed-agreement',
        version: 1,
        format: 'pdf',
        bytes: 100,
        resourceType: 'raw',
        deliveryType: 'authenticated',
        secureUrl: 'private-cloudinary-url',
        uploadedAt: new Date().toISOString(),
      })),
      generateSignedDeliveryUrl: jest.fn(() => 'https://example.test/signed.pdf'),
    };
    documentsService = {
      createSystemGeneratedRecord: jest.fn(async ({ id }) => ({ id })),
      getById: jest.fn(async () => null),
    };
    gateway = { emitToUser: jest.fn() };

    service = new LegalService(
      { db: memory.db } as any,
      { getUserById: jest.fn(async (id: string) => users[id]) } as any,
      mediaService as any,
      documentsService as any,
      { get: jest.fn(() => 'a'.repeat(64)) } as any,
      gateway as any,
    );
  });

  async function generate() {
    return service.generateLoanAgreement('loan-1', 'lender-1', 'lender');
  }

  function acceptance(
    document: Awaited<ReturnType<typeof generate>>,
    role: 'borrower' | 'lender',
  ) {
    return {
      signedName: role === 'borrower' ? 'Borrower User' : 'Lender User',
      consentAccepted: true,
      agreementVersion: document.version,
      termsHash: document.termsHash,
      fundsReceivedConfirmed: role === 'borrower' ? true : undefined,
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    };
  }

  async function lenderSignAndConfirm(
    agreement: Awaited<ReturnType<typeof generate>>,
  ) {
    await service.acceptDocument(
      agreement.id,
      'lender-1',
      'lender',
      acceptance(agreement, 'lender'),
    );
    return service.confirmDisbursement(
      agreement.id,
      'lender-1',
      'lender',
      {
        confirmationAccepted: true,
        externalReference: 'BANK-TRANSFER-1',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      },
    );
  }

  it('generates a deterministic versioned agreement only for the loan lender', async () => {
    const first = await generate();
    const identical = await generate();

    expect(first.id).toBe('agreement_loan-1_v001');
    expect(first.status).toBe('awaiting_signatures');
    expect(first.terms.principalMinor).toBe(1_200_000);
    expect(first.termsHash).toMatch(/^[a-f0-9]{64}$/);
    expect(identical.id).toBe(first.id);
    await expect(
      service.generateLoanAgreement('loan-1', 'borrower-1', 'borrower'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('records an idempotent first acceptance without exposing audit details', async () => {
    const agreement = await generate();
    const input = acceptance(agreement, 'lender');
    const first = await service.acceptDocument(
      agreement.id,
      'lender-1',
      'lender',
      input,
    );
    const repeated = await service.acceptDocument(
      agreement.id,
      'lender-1',
      'lender',
      input,
    );

    expect(first.document.status).toBe('awaiting_disbursement');
    expect(repeated.document.lenderAcceptance.accepted).toBe(true);
    expect(
      [...records.keys()].filter((path) =>
        path.startsWith('loanAgreementAcceptances/'),
      ),
    ).toHaveLength(1);
    expect(JSON.stringify(first.document)).not.toContain('ipAddressHash');
  });

  it('prevents the borrower from signing before the lender', async () => {
    const agreement = await generate();
    await expect(
      service.acceptDocument(
        agreement.id,
        'borrower-1',
        'borrower',
        acceptance(agreement, 'borrower'),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      records.has(`loanAgreementAcceptances/${agreement.id}_borrower`),
    ).toBe(false);
  });

  it('requires transfer confirmation and borrower receipt attestation', async () => {
    const agreement = await generate();
    await service.acceptDocument(
      agreement.id,
      'lender-1',
      'lender',
      acceptance(agreement, 'lender'),
    );
    await expect(
      service.acceptDocument(
        agreement.id,
        'borrower-1',
        'borrower',
        acceptance(agreement, 'borrower'),
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    await service.confirmDisbursement(
      agreement.id,
      'lender-1',
      'lender',
      { confirmationAccepted: true },
    );
    await expect(
      service.acceptDocument(
        agreement.id,
        'borrower-1',
        'borrower',
        {
          ...acceptance(agreement, 'borrower'),
          fundsReceivedConfirmed: false,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows only the loan lender to confirm transfer and is idempotent', async () => {
    const agreement = await generate();
    await service.acceptDocument(
      agreement.id,
      'lender-1',
      'lender',
      acceptance(agreement, 'lender'),
    );
    await expect(
      service.confirmDisbursement(
        agreement.id,
        'borrower-1',
        'borrower',
        { confirmationAccepted: true },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const first = await service.confirmDisbursement(
      agreement.id,
      'lender-1',
      'lender',
      { confirmationAccepted: true, externalReference: 'BANK-TRANSFER-1' },
    );
    const repeated = await service.confirmDisbursement(
      agreement.id,
      'lender-1',
      'lender',
      { confirmationAccepted: true, externalReference: 'BANK-TRANSFER-1' },
    );
    expect(first.document.status).toBe('awaiting_borrower_signature');
    expect(repeated.document.disbursementConfirmation).toMatchObject({
      confirmed: true,
      principalMinor: 1_200_000,
      externalReference: 'BANK-TRANSFER-1',
    });
  });

  it('rejects a typed signing name that differs from the verified profile', async () => {
    const agreement = await generate();
    await expect(
      service.acceptDocument(agreement.id, 'lender-1', 'lender', {
        ...acceptance(agreement, 'lender'),
        signedName: 'Someone Else',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('activates after the second signature with one ledger entry and exact installments', async () => {
    const agreement = await generate();
    const input = acceptance(agreement, 'borrower');
    await lenderSignAndConfirm(agreement);
    const result = await service.acceptDocument(
      agreement.id,
      'borrower-1',
      'borrower',
      input,
    );

    expect(result.document.status).toBe('fully_accepted');
    expect(records.get('loans/loan-1')?.status).toBe('active');
    expect(records.has('transactions/disbursement_loan-1')).toBe(true);
    const installments = [...records.entries()]
      .filter(([path]) => path.startsWith('loans/loan-1/installments/'))
      .map(([, value]) => Number(value.amountDueMinor));
    expect(installments).toHaveLength(12);
    expect(installments.reduce((sum, amount) => sum + amount, 0)).toBe(
      1_344_000,
    );
    expect(mediaService.uploadBufferAsDocument).toHaveBeenCalledTimes(1);
    expect(gateway.emitToUser).toHaveBeenCalledWith(
      'borrower-1',
      'agreement:changed',
      expect.objectContaining({
        agreementId: agreement.id,
        loanId: 'loan-1',
        changeType: 'activated',
      }),
    );
    expect(gateway.emitToUser).toHaveBeenCalledWith(
      'lender-1',
      'agreement:changed',
      expect.objectContaining({ changeType: 'activated' }),
    );
    expect(
      [...records.entries()].some(
        ([path, value]) =>
          path.startsWith('borrowerNotifications/') &&
          value.category === 'agreement',
      ),
    ).toBe(true);
    expect(
      [...records.entries()].some(
        ([path, value]) =>
          path.startsWith('notifications/') && value.category === 'agreement',
      ),
    ).toBe(true);
  });

  it('retains signatures after upload failure and retries without duplicate ledger data', async () => {
    mediaService.uploadBufferAsDocument.mockRejectedValueOnce(
      new Error('Cloudinary unavailable'),
    );
    const agreement = await generate();
    const input = acceptance(agreement, 'borrower');
    await lenderSignAndConfirm(agreement);
    const failed = await service.acceptDocument(
      agreement.id,
      'borrower-1',
      'borrower',
      input,
    );
    expect(failed.document.status).toBe('finalization_failed');
    expect(records.get('loans/loan-1')?.status).toBe('pending_disbursement');

    const retried = await service.retryFinalization(
      agreement.id,
      'borrower-1',
      'borrower',
    );
    expect(retried.document.status).toBe('fully_accepted');
    expect(
      [...records.keys()].filter((path) =>
        path.startsWith('transactions/disbursement_loan-1'),
      ),
    ).toHaveLength(1);
  });

  it('regenerates an agreement PDF when the stored Cloudinary asset is unavailable', async () => {
    const agreement = await generate();
    const storedAgreement = records.get(`loanAgreements/${agreement.id}`);
    if (!storedAgreement) throw new Error('Agreement fixture was not created.');
    storedAgreement.signedPdfDocumentId = `agreement_pdf_${agreement.id}`;
    documentsService.getById.mockResolvedValue({
      id: storedAgreement.signedPdfDocumentId,
      status: 'approved',
      cloudinaryPublicId: 'documents/loan-1/missing-agreement.pdf',
      cloudinaryResourceType: 'raw',
      cloudinaryDeliveryType: 'authenticated',
      cloudinaryVersion: 1,
      format: undefined,
    });
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 404 }));
    const fallback = Buffer.from('regenerated-pdf');
    jest.spyOn(service as any, 'buildAgreementPdf').mockResolvedValue(fallback);

    const result = await service.downloadDocumentPdf(
      agreement.id,
      'lender-1',
      'lender',
    );

    expect(result.buffer).toEqual(fallback);
    expect(result.fileName).toMatch(/\.pdf$/);
  });
});
