import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PayHereService } from './payhere.service';

describe('PayHereService', () => {
  const values: Record<string, string> = {
    PAYHERE_MERCHANT_ID: 'merchant-1',
    PAYHERE_MERCHANT_SECRET: 'secret-1',
    PAYHERE_SANDBOX: 'true',
    PAYHERE_PUBLIC_BASE_URL: 'https://payments.example.com/api/',
  };
  const service = new PayHereService({
    get: (key: string) => values[key],
  } as any);

  function notification(statusCode = '2', amount = '1250.50') {
    const hashedSecret = createHash('md5')
      .update(values.PAYHERE_MERCHANT_SECRET)
      .digest('hex')
      .toUpperCase();
    const md5sig = createHash('md5')
      .update(`merchant-1order-1${amount}LKR${statusCode}${hashedSecret}`)
      .digest('hex')
      .toUpperCase();
    return {
      merchant_id: 'merchant-1',
      order_id: 'order-1',
      payment_id: 'payment-1',
      payhere_amount: amount,
      payhere_currency: 'LKR',
      status_code: statusCode,
      md5sig,
    };
  }

  it('uses integer minor units and canonical callback paths', () => {
    expect(service.toMinor('1250.50')).toBe(125050);
    expect(service.formatMinor(125050)).toBe('1250.50');
    expect(service.urls('borrower/payments')).toEqual({
      returnUrl:
        'https://payments.example.com/api/borrower/payments/payhere/result/success',
      cancelUrl:
        'https://payments.example.com/api/borrower/payments/payhere/result/cancelled',
      notifyUrl:
        'https://payments.example.com/api/borrower/payments/payhere/notify',
    });
  });

  it.each([
    ['2', 'completed'],
    ['0', 'pending'],
    ['-1', 'cancelled'],
    ['-2', 'failed'],
    ['-3', 'charged_back'],
  ])('validates and maps callback status %s', (code, status) => {
    expect(service.verifyNotification(notification(code))).toMatchObject({
      amountMinor: 125050,
      currency: 'LKR',
      status,
    });
  });

  it('rejects malformed amounts and invalid signatures', () => {
    expect(() => service.toMinor('1e3')).toThrow(BadRequestException);
    expect(() =>
      service.verifyNotification({ ...notification(), md5sig: 'invalid' }),
    ).toThrow(BadRequestException);
  });
});
