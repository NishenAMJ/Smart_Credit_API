import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import { readDate, readString } from '../../../firebase/firestore-query.utils';
import type {
  PaymentReceivedSmsSettings,
  UpdatePaymentReceivedSmsInput,
} from './lender-sms.types';
import { SMS_PROVIDER, type SmsProvider } from './providers/sms-provider';
import type {
  PaymentReceivedNotifier,
  RecordedPaymentNotification,
} from '../shared/payment-received-notifier.port';

export const DEFAULT_PAYMENT_RECEIVED_SMS_TEMPLATE =
  'Hello {{borrowerName}}, we received your payment of {{amount}} on {{paymentDate}}. Remaining balance: {{remainingBalance}}. Thank you.';

const MAX_TEMPLATE_LENGTH = 480;

export function readPaymentReceivedSmsSettings(
  document: Record<string, unknown>,
): PaymentReceivedSmsSettings {
  const value =
    document.paymentReceived && typeof document.paymentReceived === 'object'
      ? (document.paymentReceived as Record<string, unknown>)
      : {};

  return {
    enabled: value.enabled === true,
    template:
      readString(value.template) ?? DEFAULT_PAYMENT_RECEIVED_SMS_TEMPLATE,
    updatedAt: readDate(value.updatedAt)?.toISOString() ?? null,
  };
}

@Injectable()
export class PaymentReceivedSmsService implements PaymentReceivedNotifier {
  private readonly logger = new Logger(PaymentReceivedSmsService.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    @Inject(SMS_PROVIDER) private readonly smsProvider: SmsProvider,
  ) {}

  async updateSettings(
    lenderId: string,
    input: UpdatePaymentReceivedSmsInput,
  ): Promise<PaymentReceivedSmsSettings> {
    if (typeof input?.enabled !== 'boolean') {
      throw new BadRequestException('enabled must be a boolean.');
    }

    const template = input.template?.trim() ?? '';
    if (!template) {
      throw new BadRequestException('A payment received message is required.');
    }
    if (template.length > MAX_TEMPLATE_LENGTH) {
      throw new BadRequestException(
        `The payment received message cannot exceed ${MAX_TEMPLATE_LENGTH} characters.`,
      );
    }

    const now = Timestamp.now();
    const settings = {
      enabled: input.enabled,
      template,
      updatedAt: now,
    };
    await this.settingsRef(this.firebaseService.getDb(), lenderId).set(
      {
        settingType: 'lender_sms',
        lenderId,
        paymentReceived: settings,
        updatedAt: now,
      },
      { merge: true },
    );

    return {
      ...settings,
      updatedAt: now.toDate().toISOString(),
    };
  }

  async sendForRecordedPayment(
    event: RecordedPaymentNotification,
  ): Promise<void> {
    const db = this.firebaseService.getDb();
    const deliveryRef = db
      .collection('smsDeliveries')
      .doc(this.deliveryId(event.transactionId));
    const [settingsSnapshot, deliverySnapshot] = await Promise.all([
      this.settingsRef(db, event.lenderId).get(),
      deliveryRef.get(),
    ]);

    if (deliverySnapshot.exists) return;

    const settingsDocument = (settingsSnapshot.data() ?? {}) as Record<
      string,
      unknown
    >;
    const automation = readPaymentReceivedSmsSettings(settingsDocument);
    if (
      settingsDocument.enabled !== true ||
      !automation.enabled ||
      !this.smsProvider.isConfigured()
    ) {
      return;
    }

    const borrowerSnapshot = await db
      .collection('users')
      .doc(event.borrowerId)
      .get();
    const borrower = (borrowerSnapshot.data() ?? {}) as Record<string, unknown>;
    const phone = readString(borrower.phone);
    if (!borrowerSnapshot.exists || !phone) {
      this.logger.warn(
        `Payment SMS skipped because borrower ${event.borrowerId} has no phone number.`,
      );
      return;
    }

    const message = this.renderTemplate(automation.template, {
      borrowerName: readString(borrower.fullName) ?? 'borrower',
      amount: this.formatMoney(event.amountMinor),
      paymentDate: this.formatDate(event.paidAt),
      remainingBalance: this.formatMoney(event.remainingBalanceMinor),
    });
    if (message.length > MAX_TEMPLATE_LENGTH) {
      this.logger.warn(
        `Payment SMS skipped because the rendered message for ${event.transactionId} exceeds ${MAX_TEMPLATE_LENGTH} characters.`,
      );
      return;
    }

    try {
      const providerMessageId = await this.smsProvider.send({
        to: phone,
        message,
      });
      const now = Timestamp.now();
      const auditLogId = `sms_${randomUUID()}`;
      const batch = db.batch();
      batch.create(deliveryRef, {
        deliveryId: deliveryRef.id,
        type: 'payment_received',
        status: 'sent',
        lenderId: event.lenderId,
        borrowerId: event.borrowerId,
        loanId: event.loanId,
        transactionId: event.transactionId,
        providerMessageId,
        messageHash: createHash('sha256').update(message).digest('hex'),
        createdAt: now,
        sentAt: now,
      });
      batch.create(db.collection('auditLogs').doc(auditLogId), {
        auditLogId,
        actorUserId: event.lenderId,
        actorRole: 'lender',
        action: 'sms.payment_received.sent',
        entityType: 'transaction',
        entityId: event.transactionId,
        before: null,
        after: { deliveryStatus: 'sent' },
        metadata: {
          channel: 'sms',
          messageLength: message.length,
          providerMessageId,
        },
        createdAt: now,
      });
      await batch.commit();
    } catch (error) {
      this.logger.warn(
        `Payment ${event.transactionId} was recorded, but its SMS could not be sent: ${error instanceof Error ? error.message : 'unknown provider error'}`,
      );
    }
  }

  private renderTemplate(
    template: string,
    values: Record<string, string>,
  ): string {
    return Object.entries(values).reduce(
      (message, [key, value]) => message.replaceAll(`{{${key}}}`, value),
      template,
    );
  }

  private formatMoney(amountMinor: number): string {
    return `LKR ${(amountMinor / 100).toLocaleString('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-LK', {
      timeZone: 'Asia/Colombo',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  private settingsRef(db: Firestore, lenderId: string) {
    return db
      .collection('systemSettings')
      .doc(`sms_${lenderId.replaceAll('/', '_')}`);
  }

  private deliveryId(transactionId: string): string {
    return `payment_received_${transactionId.replaceAll('/', '_')}`;
  }
}
