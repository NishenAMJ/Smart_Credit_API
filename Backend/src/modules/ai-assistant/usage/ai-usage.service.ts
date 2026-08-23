import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';

@Injectable()
export class AiUsageService {
  constructor(
    private readonly configService: ConfigService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async assertWithinLimit(userId: string): Promise<void> {
    const now = Date.now();
    const windowSizeMs = 5 * 60 * 1000;
    const bucket = Math.floor(now / windowSizeMs);
    const configuredLimit = Number(
      this.configService.get<string>('AI_MESSAGE_LIMIT_PER_5_MINUTES') ?? '20',
    );
    const limit = Number.isFinite(configuredLimit)
      ? Math.min(Math.max(configuredLimit, 1), 100)
      : 20;
    const userHash = createHash('sha256').update(userId).digest('hex');
    const usageRef = this.firebaseService
      .getDb()
      .collection('aiUsage')
      .doc(`${userHash}_${bucket}`);

    await this.firebaseService.getDb().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(usageRef);
      const count = snapshot.exists ? Number(snapshot.get('count') ?? 0) : 0;

      if (count >= limit) {
        throw new HttpException(
          'The AI assistant message limit has been reached. Please try again shortly.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      transaction.set(
        usageRef,
        {
          count: count + 1,
          bucket,
          updatedAt: Timestamp.fromMillis(now),
          expiresAt: Timestamp.fromMillis((bucket + 2) * windowSizeMs),
        },
        { merge: true },
      );
    });
  }
}
