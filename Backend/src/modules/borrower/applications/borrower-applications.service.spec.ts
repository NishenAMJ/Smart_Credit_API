import { BorrowerApplicationsService } from './borrower-applications.service';
import {
  LoanApplicationStatus,
  LoanPurpose,
  RepaymentMethod,
} from './dto/loan-application.dto';

describe('BorrowerApplicationsService', () => {
  it('should be defined', () => {
    const service = new BorrowerApplicationsService({} as any, {} as any);

    expect(service).toBeDefined();
  });

  it('creates a submitted canonical application in one write', async () => {
    let written: Record<string, unknown> = {};
    const applicationRef = {
      id: 'application_new',
      set: jest.fn(async (data) => {
        written = data;
      }),
      get: jest.fn(async () => ({ data: () => written })),
    };
    const profile = {
      exists: true,
      data: () => ({ kycStatus: 'approved' }),
    };
    const listingData = {
      lenderId: 'lender_1',
      status: 'active',
      minAmountMinor: 1_000_000,
      maxAmountMinor: 100_000_000,
      minTenureMonths: 3,
      maxTenureMonths: 24,
    };
    const listing = {
      exists: true,
      get: (field: string) => listingData[field as keyof typeof listingData],
      data: () => listingData,
    };
    const db = {
      collection: jest.fn((name: string) => ({
        doc: jest.fn((id?: string) => {
          if (name === 'users') return { get: jest.fn(async () => profile) };
          if (name === 'loanListings') {
            return { get: jest.fn(async () => listing) };
          }
          if (!id) return applicationRef;
          throw new Error(`Unexpected application id ${id}`);
        }),
      })),
    };
    const creditScoreService = {
      getSummary: jest.fn(async () => ({
        score: 720,
        rating: 'good',
        breakdown: { repayment: { subScore: 80 } },
      })),
    };
    const service = new BorrowerApplicationsService(
      { db } as any,
      creditScoreService as any,
    );

    const result = await service.createLoanApplication(
      {
        borrowerId: 'borrower_1',
        adId: 'listing_1',
        amount: 100_000,
        tenureMonths: 12,
        loanPurpose: LoanPurpose.BUSINESS,
        preferredRepaymentMethod: RepaymentMethod.QR_PAYMENT,
      },
      { submitImmediately: true },
    );

    expect(result).toMatchObject({
      applicationId: 'application_new',
      listingId: 'listing_1',
      lenderId: 'lender_1',
      borrowerId: 'borrower_1',
      requestedPrincipalMinor: 10_000_000,
      requestedTenureMonths: 12,
      status: 'submitted',
      borrowerCreditScore: 720,
    });
    expect(result.submittedAt).toBeTruthy();
    expect(applicationRef.set).toHaveBeenCalledTimes(1);
  });

  it('maps draft edits to canonical Firestore fields', async () => {
    const update = jest.fn(async () => undefined);
    const db = {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ update })),
      })),
    };
    const service = new BorrowerApplicationsService({ db } as any, {} as any);
    jest.spyOn(service, 'getLoanApplicationById').mockResolvedValue({
      borrowerId: 'borrower_1',
      status: LoanApplicationStatus.DRAFT,
    } as any);

    await service.updateLoanApplication('application_1', 'borrower_1', {
      amount: 75_000,
      loanPurpose: LoanPurpose.MEDICAL,
      purposeDescription: 'Treatment',
      tenureMonths: 6,
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedPrincipalMinor: 7_500_000,
        requestedPurpose: 'medical',
        purposeDescription: 'Treatment',
        requestedTenureMonths: 6,
      }),
    );
    expect(update.mock.calls[0][0]).not.toHaveProperty('amount');
    expect(update.mock.calls[0][0]).not.toHaveProperty('loanPurpose');
    expect(update.mock.calls[0][0]).not.toHaveProperty('tenureMonths');
  });

  it('treats repeated submission of an already submitted application as idempotent', async () => {
    const creditScoreService = { getSummary: jest.fn() };
    const service = new BorrowerApplicationsService(
      {} as any,
      creditScoreService as any,
    );
    const application = {
      applicationId: 'application_1',
      borrowerId: 'borrower_1',
      status: LoanApplicationStatus.PENDING,
    } as any;
    jest
      .spyOn(service, 'getLoanApplicationById')
      .mockResolvedValue(application);

    await expect(
      service.submitLoanApplication('application_1', 'borrower_1'),
    ).resolves.toBe(application);
    expect(creditScoreService.getSummary).not.toHaveBeenCalled();
  });
});
