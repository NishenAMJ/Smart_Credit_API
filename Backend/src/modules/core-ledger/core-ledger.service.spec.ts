import { CoreLedgerService } from './core-ledger.service';

describe('CoreLedgerService agreement approval', () => {
  it('atomically creates one pending loan and unsigned version-one agreement', async () => {
    const records = new Map<string, Record<string, any>>([
      [
        'loanApplications/application-1',
        {
          applicationId: 'application-1',
          listingId: 'listing-1',
          borrowerId: 'borrower-1',
          lenderId: 'lender-1',
          requestedPrincipalMinor: 1_000_000,
          requestedTenureMonths: 10,
          status: 'submitted',
          convertedLoanId: null,
        },
      ],
      [
        'loanListings/listing-1',
        {
          lenderId: 'lender-1',
          minAmountMinor: 500_000,
          maxAmountMinor: 2_000_000,
          minInterestRateAnnual: 10,
          maxInterestRateAnnual: 20,
          minTenureMonths: 6,
          maxTenureMonths: 24,
        },
      ],
      [
        'users/borrower-1',
        {
          userId: 'borrower-1',
          fullName: 'Borrower',
          email: 'b@example.com',
          phone: '+94770000001',
        },
      ],
      [
        'users/lender-1',
        {
          userId: 'lender-1',
          fullName: 'Lender',
          email: 'l@example.com',
          phone: '+94770000002',
        },
      ],
    ]);
    let generated = 0;
    const reference = (path: string): any => ({
      id: path.split('/').at(-1),
      path,
      collection: (name: string) => ({
        doc: (id: string) => reference(`${path}/${name}/${id}`),
      }),
    });
    const db: any = {
      collection: (name: string) => ({
        doc: (id?: string) =>
          reference(`${name}/${id ?? `loan-${++generated}`}`),
        add: async (value: Record<string, unknown>) => {
          const ref = reference(`${name}/notification-${++generated}`);
          records.set(ref.path, value);
          return ref;
        },
      }),
      runTransaction: async (work: (transaction: any) => unknown) =>
        work({
          get: async (ref: any) => ({
            exists: records.has(ref.path),
            data: () => records.get(ref.path),
          }),
          set: (ref: any, value: Record<string, unknown>) =>
            records.set(ref.path, value),
          update: (ref: any, value: Record<string, unknown>) =>
            records.set(ref.path, { ...records.get(ref.path), ...value }),
        }),
    };
    const gateway = { emitToUser: jest.fn() };
    const service = new CoreLedgerService({ db } as any, gateway as any);

    const result = await service.approveApplication(
      'application-1',
      'lender-1',
      {
        approvedPrincipalMinor: 1_000_000,
        annualInterestRate: 12,
        approvedTenureMonths: 10,
        decisionNote: 'Approved',
      },
    );

    expect(result).toEqual({
      loanId: 'loan-1',
      agreementId: 'agreement_loan-1_v001',
    });
    expect(records.get('loans/loan-1')).toMatchObject({
      status: 'pending_disbursement',
      agreementStatus: 'awaiting_signatures',
      currentAgreementId: 'agreement_loan-1_v001',
      firstPaymentDueAt: null,
    });
    expect(records.get('loanAgreements/agreement_loan-1_v001')).toMatchObject({
      version: 1,
      status: 'awaiting_signatures',
      borrowerAcceptance: { accepted: false },
      lenderAcceptance: { accepted: false },
      disbursementConfirmation: { confirmed: false },
    });
    expect(
      [...records.keys()].filter((path) => path.includes('/installments/')),
    ).toHaveLength(0);
    expect(records.get('loanApplications/application-1')).toMatchObject({
      status: 'converted',
      convertedLoanId: 'loan-1',
    });
    expect(gateway.emitToUser).toHaveBeenCalledWith(
      'borrower-1',
      'agreement:changed',
      expect.objectContaining({
        agreementId: 'agreement_loan-1_v001',
        changeType: 'created',
      }),
    );
    expect(gateway.emitToUser).toHaveBeenCalledWith(
      'lender-1',
      'agreement:changed',
      expect.objectContaining({ changeType: 'created' }),
    );

    await expect(
      service.approveApplication('application-1', 'lender-1', {
        approvedPrincipalMinor: 1_000_000,
        annualInterestRate: 12,
        approvedTenureMonths: 10,
      }),
    ).resolves.toEqual(result);

    expect(
      [...records.keys()].filter((path) => path.startsWith('loans/')),
    ).toHaveLength(1);
    expect(
      [...records.keys()].filter((path) =>
        path.startsWith(
          'borrowerNotifications/borrower__borrower-1__agreement-created-',
        ),
      ),
    ).toHaveLength(1);
  });
});
