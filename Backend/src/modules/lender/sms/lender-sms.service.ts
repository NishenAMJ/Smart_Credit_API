import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import { readDate, readString } from '../../../firebase/firestore-query.utils';
import type {
  LenderSmsSettings,
  SendSmsInput,
  SendSmsResponse,
  SmsBorrower,
  SmsBorrowerSearchResponse,
  SmsDeliveryResult,
} from './lender-sms.types';
import { SMS_PROVIDER, type SmsProvider } from './providers/sms-provider';

const MAX_RECIPIENTS = 50;
const MAX_MESSAGE_LENGTH = 480;

@Injectable()
export class LenderSmsService {
  constructor(
    private readonly firebaseService: FirebaseService,
    @Inject(SMS_PROVIDER) private readonly smsProvider: SmsProvider,
  ) {}

  async getSettings(lenderId: string): Promise<LenderSmsSettings> {
    const snapshot = await this.settingsRef(
      this.firebaseService.getDb(),
      lenderId,
    ).get();
    const data = (snapshot.data() ?? {}) as Record<string, unknown>;

    return {
      enabled: data.enabled === true,
      configured: this.smsProvider.isConfigured(),
      sender: this.smsProvider.getSenderId(),
      updatedAt: readDate(data.updatedAt)?.toISOString() ?? null,
    };
  }

  async setEnabled(
    lenderId: string,
    enabled: boolean | undefined,
  ): Promise<LenderSmsSettings> {
    if (typeof enabled !== 'boolean') {
      throw new BadRequestException('enabled must be a boolean.');
    }

    const now = Timestamp.now();
    await this.settingsRef(this.firebaseService.getDb(), lenderId).set(
      {
        settingType: 'lender_sms',
        lenderId,
        enabled,
        updatedAt: now,
      },
      { merge: true },
    );

    return {
      enabled,
      configured: this.smsProvider.isConfigured(),
      sender: this.smsProvider.getSenderId(),
      updatedAt: now.toDate().toISOString(),
    };
  }

  async searchBorrowers(
    lenderId: string,
    search: string,
    limit: number,
  ): Promise<SmsBorrowerSearchResponse> {
    const db = this.firebaseService.getDb();
    const borrowerIds = await this.getLinkedBorrowerIds(db, lenderId);
    const borrowers = await this.getBorrowers(db, borrowerIds);
    const normalizedSearch = search.trim().toLowerCase();
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 50);

    return {
      borrowers: borrowers
        .filter((borrower) => {
          if (!normalizedSearch) return true;
          return [
            borrower.fullName,
            borrower.email,
            borrower.phone,
            borrower.borrowerId,
          ].some((value) => value.toLowerCase().includes(normalizedSearch));
        })
        .sort((left, right) => left.fullName.localeCompare(right.fullName))
        .slice(0, safeLimit),
    };
  }

  async send(lenderId: string, input: SendSmsInput): Promise<SendSmsResponse> {
    const message = input.message?.trim() ?? '';
    const borrowerIds = Array.from(
      new Set(
        (input.borrowerIds ?? [])
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );

    if (!message) {
      throw new BadRequestException('message is required.');
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(
        `message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
      );
    }
    if (borrowerIds.length === 0) {
      throw new BadRequestException('Select at least one borrower.');
    }
    if (borrowerIds.length > MAX_RECIPIENTS) {
      throw new BadRequestException(
        `A maximum of ${MAX_RECIPIENTS} borrowers can be messaged at once.`,
      );
    }

    if (!this.smsProvider.isConfigured()) {
      throw new ServiceUnavailableException(
        'SMS provider is not configured on the server.',
      );
    }

    const db = this.firebaseService.getDb();
    await this.assertEnabled(db, lenderId);
    const linkedBorrowerIds = new Set(
      await this.getLinkedBorrowerIds(db, lenderId),
    );
    if (borrowerIds.some((borrowerId) => !linkedBorrowerIds.has(borrowerId))) {
      throw new BadRequestException(
        'One or more selected borrowers do not belong to this lender.',
      );
    }

    const borrowers = await this.getBorrowers(db, borrowerIds);
    if (borrowers.length !== borrowerIds.length) {
      throw new BadRequestException(
        'One or more selected borrowers do not have a valid phone number.',
      );
    }

    const borrowerById = new Map(
      borrowers.map((borrower) => [borrower.borrowerId, borrower]),
    );
    const results: SmsDeliveryResult[] = [];

    for (const borrowerId of borrowerIds) {
      const borrower = borrowerById.get(borrowerId);
      if (!borrower) continue;

      try {
        await this.assertEnabled(db, lenderId);
        const providerMessageId = await this.smsProvider.send({
          to: borrower.phone,
          message,
        });
        results.push({
          borrowerId,
          phone: borrower.phone,
          status: 'sent',
          providerMessageId,
          error: null,
        });
      } catch (error) {
        results.push({
          borrowerId,
          phone: borrower.phone,
          status: 'failed',
          providerMessageId: null,
          error:
            error instanceof ConflictException
              ? 'SMS sending was disabled.'
              : 'The SMS provider rejected this message.',
        });

        if (error instanceof ConflictException) break;
      }
    }

    await this.writeAuditLogs(db, lenderId, message, results);
    const sent = results.filter((result) => result.status === 'sent').length;

    return {
      attempted: results.length,
      sent,
      failed: results.length - sent,
      results,
    };
  }

  async isEnabled(lenderId: string): Promise<boolean> {
    const settings = await this.getSettings(lenderId);
    return settings.enabled && settings.configured;
  }

  private async assertEnabled(db: Firestore, lenderId: string): Promise<void> {
    const snapshot = await this.settingsRef(db, lenderId).get();
    if (snapshot.data()?.enabled !== true) {
      throw new ConflictException('SMS sending is currently disabled.');
    }
  }

  private settingsRef(db: Firestore, lenderId: string) {
    const safeLenderId = lenderId.replaceAll('/', '_');
    return db.collection('systemSettings').doc(`sms_${safeLenderId}`);
  }

  private async getLinkedBorrowerIds(
    db: Firestore,
    lenderId: string,
  ): Promise<string[]> {
    const snapshot = await db
      .collection('loans')
      .where('lenderId', '==', lenderId)
      .get();

    return Array.from(
      new Set(
        snapshot.docs
          .map((doc) => readString(doc.data().borrowerId))
          .filter((borrowerId): borrowerId is string => Boolean(borrowerId)),
      ),
    );
  }

  private async getBorrowers(
    db: Firestore,
    borrowerIds: string[],
  ): Promise<SmsBorrower[]> {
    if (borrowerIds.length === 0) return [];

    const snapshots = await db.getAll(
      ...borrowerIds.map((borrowerId) =>
        db.collection('users').doc(borrowerId),
      ),
    );

    return snapshots.flatMap((snapshot) => {
      const data = (snapshot.data() ?? {}) as Record<string, unknown>;
      const phone = readString(data.phone);
      if (!phone) return [];

      return [
        {
          borrowerId: snapshot.id,
          fullName: readString(data.fullName) ?? snapshot.id,
          email: readString(data.email) ?? 'No email',
          phone,
        },
      ];
    });
  }

  private async writeAuditLogs(
    db: Firestore,
    lenderId: string,
    message: string,
    results: SmsDeliveryResult[],
  ): Promise<void> {
    const sentResults = results.filter((result) => result.status === 'sent');
    if (sentResults.length === 0) return;

    const batch = db.batch();
    const now = Timestamp.now();
    sentResults.forEach((result) => {
      const auditLogId = `sms_${randomUUID()}`;
      batch.set(db.collection('auditLogs').doc(auditLogId), {
        auditLogId,
        actorUserId: lenderId,
        actorRole: 'lender',
        action: 'sms.sent',
        entityType: 'user',
        entityId: result.borrowerId,
        before: null,
        after: { deliveryStatus: 'sent' },
        metadata: {
          channel: 'sms',
          messageLength: message.length,
          providerMessageId: result.providerMessageId,
        },
        createdAt: now,
      });
    });
    await batch.commit();
  }
}
