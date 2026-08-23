import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import {
  PayHereNotification,
  PayHereOrderStatus,
  PayHereRetrievedPayment,
  VerifiedPayHereNotification,
} from './payhere.types';

@Injectable()
export class PayHereService implements OnModuleInit {
  private readonly logger = new Logger(PayHereService.name);
  private accessToken: { value: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const production = this.environment() === 'production';
    const enabled =
      this.config.get<string>('PAYMENT_GATEWAY_PROVIDER') === 'payhere' ||
      Boolean(this.config.get<string>('PAYHERE_MERCHANT_ID'));
    if (!production || !enabled) return;

    const required = [
      'PAYHERE_MERCHANT_ID',
      'PAYHERE_MERCHANT_SECRET',
      'PAYHERE_PUBLIC_BASE_URL',
      'PAYHERE_APP_ID',
      'PAYHERE_APP_SECRET',
    ].filter((key) => !this.config.get<string>(key)?.trim());
    if (required.length) {
      throw new Error(
        `Missing production PayHere configuration: ${required.join(', ')}`,
      );
    }
    this.publicBaseUrl();
    this.checkoutUrl();
  }

  merchantId() {
    return this.required('PAYHERE_MERCHANT_ID');
  }

  checkoutUrl() {
    const sandbox = this.isSandbox();
    const expected = sandbox
      ? 'https://sandbox.payhere.lk/pay/checkout'
      : 'https://www.payhere.lk/pay/checkout';
    const configured = this.config.get<string>('PAYHERE_CHECKOUT_URL')?.trim();
    const url = configured || expected;
    if (this.environment() === 'production' && url !== expected) {
      throw new Error(
        `PAYHERE_CHECKOUT_URL does not match PAYHERE_SANDBOX mode.`,
      );
    }
    return url;
  }

  publicBaseUrl(requestBaseUrl?: string) {
    let configured =
      this.config.get<string>('PAYHERE_PUBLIC_BASE_URL') ??
      this.config.get<string>('PUBLIC_API_BASE_URL') ??
      this.config.get<string>('API_PUBLIC_URL');
    if (!configured && this.environment() !== 'production') {
      const legacyNotifyUrl = this.config
        .get<string>('PAYHERE_NOTIFY_URL')
        ?.trim();
      if (legacyNotifyUrl) {
        try {
          configured = new URL(legacyNotifyUrl).origin;
        } catch {
          // The validation below reports an invalid fallback URL consistently.
          configured = legacyNotifyUrl;
        }
      }
    }
    const value = (configured || requestBaseUrl || '').trim();
    if (!value) {
      throw new InternalServerErrorException(
        'PayHere public URL is not configured.',
      );
    }
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new InternalServerErrorException('PayHere public URL is invalid.');
    }
    if (this.environment() === 'production' && parsed.protocol !== 'https:') {
      throw new InternalServerErrorException(
        'PayHere public URL must use HTTPS in production.',
      );
    }
    const pathname = parsed.pathname
      .replace(/\/api\/?$/, '')
      .replace(/\/$/, '');
    return `${parsed.origin}${pathname}`;
  }

  urls(routePrefix: string, requestBaseUrl?: string) {
    const base = this.publicBaseUrl(requestBaseUrl);
    const prefix = routePrefix.replace(/^\/+|\/+$/g, '');
    return {
      returnUrl: `${base}/api/${prefix}/payhere/result/success`,
      cancelUrl: `${base}/api/${prefix}/payhere/result/cancelled`,
      notifyUrl: `${base}/api/${prefix}/payhere/notify`,
    };
  }

  toMinor(value: number | string) {
    const text = typeof value === 'number' ? String(value) : value.trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
      throw new BadRequestException(
        'Payment amount must have at most two decimal places.',
      );
    }
    const [whole, fraction = ''] = text.split('.');
    const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (!Number.isSafeInteger(minor) || minor <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0.');
    }
    return minor;
  }

  formatMinor(amountMinor: number) {
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      throw new BadRequestException('Invalid payment amount.');
    }
    return `${Math.floor(amountMinor / 100)}.${String(amountMinor % 100).padStart(2, '0')}`;
  }

  checkoutHash(orderId: string, amount: string, currency: string) {
    const merchantId = this.merchantId();
    const hashedSecret = this.md5(
      this.required('PAYHERE_MERCHANT_SECRET'),
    ).toUpperCase();
    return this.md5(
      `${merchantId}${orderId}${amount}${currency}${hashedSecret}`,
    ).toUpperCase();
  }

  verifyNotification(
    payload: PayHereNotification,
  ): VerifiedPayHereNotification {
    const merchantId = this.merchantId();
    const required = [
      payload.merchant_id,
      payload.order_id,
      payload.payhere_amount,
      payload.payhere_currency,
      payload.status_code,
      payload.md5sig,
    ];
    if (required.some((value) => typeof value !== 'string' || !value.trim())) {
      throw new BadRequestException('Invalid PayHere notification.');
    }
    if (payload.merchant_id !== merchantId) {
      throw new BadRequestException('Invalid PayHere merchant.');
    }
    const statusCode = String(payload.status_code);
    if (!['2', '0', '-1', '-2', '-3'].includes(statusCode)) {
      throw new BadRequestException('Unsupported PayHere payment status.');
    }
    const expected = this.md5(
      `${payload.merchant_id}${payload.order_id}${payload.payhere_amount}${payload.payhere_currency}${statusCode}${this.md5(this.required('PAYHERE_MERCHANT_SECRET')).toUpperCase()}`,
    ).toUpperCase();
    const received = String(payload.md5sig).toUpperCase();
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const receivedBuffer = Buffer.from(received, 'utf8');
    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      throw new BadRequestException('Invalid PayHere signature.');
    }
    const sanitized = {
      merchantId,
      orderId: String(payload.order_id),
      paymentId: payload.payment_id ? String(payload.payment_id) : null,
      amount: String(payload.payhere_amount),
      currency: String(payload.payhere_currency),
      statusCode,
      method: payload.method ? String(payload.method).slice(0, 40) : null,
      statusMessage: payload.status_message
        ? String(payload.status_message).slice(0, 200)
        : null,
    };
    return {
      orderId: String(payload.order_id),
      paymentId: payload.payment_id ? String(payload.payment_id) : null,
      amountMinor: this.toMinor(String(payload.payhere_amount)),
      currency: String(payload.payhere_currency),
      statusCode,
      status: this.statusFromCode(statusCode),
      eventId: createHash('sha256')
        .update(JSON.stringify(sanitized))
        .digest('hex'),
      sanitized,
    };
  }

  statusFromCode(code: string): PayHereOrderStatus {
    if (code === '2') return 'completed';
    if (code === '0') return 'pending';
    if (code === '-1') return 'cancelled';
    if (code === '-3') return 'charged_back';
    return 'failed';
  }

  async retrievePayment(
    orderId: string,
  ): Promise<PayHereRetrievedPayment | null> {
    const appId = this.config.get<string>('PAYHERE_APP_ID')?.trim();
    const appSecret = this.config.get<string>('PAYHERE_APP_SECRET')?.trim();
    if (!appId || !appSecret) return null;
    const token = await this.getAccessToken(appId, appSecret);
    const response = await fetch(
      `${this.apiBaseUrl()}/merchant/v1/payment/search?order_id=${encodeURIComponent(orderId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );
    if (!response.ok)
      throw new Error(`PayHere retrieval failed with HTTP ${response.status}.`);
    const body = (await response.json()) as {
      status?: number;
      data?: Array<Record<string, unknown>> | null;
    };
    if (body.status === -1 || !body.data?.length) return null;
    if (body.status !== 1)
      throw new Error('PayHere retrieval request was rejected.');
    const match =
      body.data.find((item) => String(item.order_id) === orderId) ??
      body.data[0];
    const status = String(
      match.status,
    ).toUpperCase() as PayHereRetrievedPayment['status'];
    if (
      ![
        'RECEIVED',
        'REFUND REQUESTED',
        'REFUND PROCESSING',
        'REFUNDED',
        'CHARGEBACKED',
      ].includes(status)
    ) {
      throw new Error('PayHere returned an unsupported payment state.');
    }
    return {
      orderId: String(match.order_id),
      paymentId: String(match.payment_id),
      status,
      amountMinor: this.toMinor(String(match.amount)),
      currency: String(match.currency),
    };
  }

  reconciliationEnabled() {
    return Boolean(
      this.config.get<string>('PAYHERE_APP_ID')?.trim() &&
      this.config.get<string>('PAYHERE_APP_SECRET')?.trim(),
    );
  }

  logReconciliationError(orderId: string, error: unknown) {
    this.logger.error(
      `PayHere reconciliation failed for order ${orderId}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  private async getAccessToken(appId: string, appSecret: string) {
    if (this.accessToken && this.accessToken.expiresAt > Date.now() + 30_000) {
      return this.accessToken.value;
    }
    const response = await fetch(
      `${this.apiBaseUrl()}/merchant/v1/oauth/token`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${appId}:${appSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ grant_type: 'client_credentials' }),
      },
    );
    if (!response.ok)
      throw new Error(`PayHere OAuth failed with HTTP ${response.status}.`);
    const body = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!body.access_token)
      throw new Error(
        'PayHere OAuth response did not include an access token.',
      );
    this.accessToken = {
      value: body.access_token,
      expiresAt:
        Date.now() + Math.max(60, Number(body.expires_in) || 599) * 1000,
    };
    return body.access_token;
  }

  private apiBaseUrl() {
    return this.isSandbox()
      ? 'https://sandbox.payhere.lk'
      : 'https://www.payhere.lk';
  }

  private isSandbox() {
    const configuredMode = this.config.get<string>('PAYHERE_SANDBOX');
    if (!configuredMode?.trim()) {
      return String(
        this.config.get<string>('PAYHERE_CHECKOUT_URL') ?? '',
      ).includes('sandbox.payhere.lk');
    }
    return ['true', '1', 'yes', 'sandbox'].includes(
      String(configuredMode).trim().toLowerCase(),
    );
  }

  private environment() {
    return String(
      this.config.get<string>('NODE_ENV') ??
        process.env.NODE_ENV ??
        'development',
    ).toLowerCase();
  }

  private required(key: string) {
    const value = this.config.get<string>(key)?.trim();
    if (!value)
      throw new InternalServerErrorException(
        'PayHere is not configured on the server.',
      );
    return value;
  }

  private md5(value: string) {
    return createHash('md5').update(value).digest('hex');
  }
}
