import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { InitUploadDto } from '../documents/dto/documents.dto';
import { CreateAdBoostDto } from './ad-boosts/ad-boosts.dto';
import { CreateLenderAdDto } from './lender-ads/lender-ads.dto';
import { LoanRequestDecisionDto } from './loan-requests/loan-requests.dto';
import { UpdateLenderProfileDto } from './lender-profile/lender-profile.dto';
import { UpdateLenderSettingsDto } from './lender-settings/lender-settings.dto';
import { RecordInstallmentPaymentDto } from './payments/payments.dto';
import { SendLenderSmsDto } from './sms/lender-sms.dto';

async function errorsFor<T extends object>(type: new () => T, value: unknown) {
  return validate(plainToInstance(type, value));
}

describe('lender mutation validation contracts', () => {
  const validAd = {
    headline: 'Working capital for retailers',
    minAmount: 10_000,
    maxAmount: 5_000_000,
    interestRate: 14.5,
    tenureMonths: 60,
    borrowerFocus: 'Registered retail businesses',
    processingTime: 'Within two business days',
    repaymentStyle: 'Monthly installments',
    requirements: 'Identity and verified income documents',
    supportNote: 'A straightforward working-capital lending offer.',
  };

  it('accepts advertisement boundary values used by the web form', async () => {
    expect(await errorsFor(CreateLenderAdDto, validAd)).toHaveLength(0);
  });

  it.each([
    ['amount below LKR 10,000', { ...validAd, minAmount: 9_999 }],
    ['tenure below three months', { ...validAd, tenureMonths: 2 }],
    ['tenure above sixty months', { ...validAd, tenureMonths: 61 }],
    ['fractional tenure', { ...validAd, tenureMonths: 12.5 }],
    ['zero interest', { ...validAd, interestRate: 0 }],
  ])('rejects %s', async (_label, value) => {
    expect((await errorsFor(CreateLenderAdDto, value)).length).toBeGreaterThan(
      0,
    );
  });

  it('validates profile contact and response-time limits', async () => {
    const errors = await errorsFor(UpdateLenderProfileDto, {
      fullName: 'A',
      email: 'invalid',
      phone: '123',
      responseTimeHours: 73,
    });
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'fullName',
        'email',
        'phone',
        'responseTimeHours',
      ]),
    );
  });

  it('bounds SMS recipients and messages', async () => {
    expect(
      await errorsFor(SendLenderSmsDto, {
        borrowerIds: Array.from({ length: 51 }, (_, index) => `b${index}`),
        message: 'x'.repeat(481),
      }),
    ).toHaveLength(2);
  });

  it('rejects invalid payment dates, methods, and long notes', async () => {
    const errors = await errorsFor(RecordInstallmentPaymentDto, {
      amount: 'NaN',
      paidAt: 'not-a-date',
      paymentMethod: 'crypto',
      note: 'x'.repeat(501),
    });
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['amount', 'paidAt', 'paymentMethod', 'note']),
    );
  });

  it('rejects unsupported or oversized document uploads', async () => {
    const errors = await errorsFor(InitUploadDto, {
      category: 'dispute_evidence',
      documentType: 'dispute_evidence',
      fileName: 'evidence.exe',
      contentType: 'application/octet-stream',
      sizeBytes: 10 * 1024 * 1024 + 1,
    });
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['contentType', 'sizeBytes']),
    );
  });

  it('validates boost, decision, and nested settings enums and ranges', async () => {
    expect(
      await errorsFor(CreateAdBoostDto, {
        listingId: 'ad',
        planId: 'plan',
        paymentMethod: 'cash',
      }),
    ).not.toHaveLength(0);
    expect(
      await errorsFor(LoanRequestDecisionDto, {
        decision: 'approve',
        approvedTenureMonths: 120,
      }),
    ).not.toHaveLength(0);
    expect(
      await errorsFor(UpdateLenderSettingsDto, {
        workspace: { borrowerTablePageSize: 101 },
      }),
    ).not.toHaveLength(0);
  });
});
