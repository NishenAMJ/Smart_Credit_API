import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AdBoostsService } from './ad-boosts.service';

describe('AdBoostsService', () => {
  const values: Record<string, string> = {};
  const config = {
    get: jest.fn((key: string) => values[key]),
  };
  const firebase = { getDb: jest.fn() };
  const notifications = { create: jest.fn() };

  beforeEach(() => {
    Object.keys(values).forEach((key) => delete values[key]);
    jest.clearAllMocks();
  });

  function service() {
    return new AdBoostsService(
      firebase as never,
      config as never,
      notifications as never,
    );
  }

  it('returns server-owned default plans and configured bank details', () => {
    values.BOOST_PLAN_7_DAYS_FEE_LKR = '1750';
    values.BOOST_BANK_NAME = 'Test Bank';

    const result = service().getPlans();

    expect(result.plans).toHaveLength(3);
    expect(result.plans[0]).toMatchObject({
      id: 'boost_7_days',
      durationDays: 7,
      amountMinor: 175000,
      currency: 'LKR',
    });
    expect(result.bankAccount.bankName).toBe('Test Bank');
  });

  it('rejects unsupported payment methods before creating records', async () => {
    await expect(
      service().createBoost('lender-1', {
        listingId: 'listing-1',
        planId: 'boost_7_days',
        paymentMethod: 'cash' as never,
        requestBaseUrl: 'http://localhost:3000',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(firebase.getDb).not.toHaveBeenCalled();
  });

  it('does not create a card boost when PayHere is not configured', async () => {
    await expect(
      service().createBoost('lender-1', {
        listingId: 'listing-1',
        planId: 'boost_7_days',
        paymentMethod: 'card',
        requestBaseUrl: 'http://localhost:3000',
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(firebase.getDb).not.toHaveBeenCalled();
  });

  it('requires a reason when an admin rejects a bank payment', async () => {
    await expect(
      service().decideBankPayment('admin-1', 'boost-1', false, '  '),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(firebase.getDb).not.toHaveBeenCalled();
  });
});
