import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { getFirestore } from '../../../config/firebase.config';
import { Advertisement } from '../interfaces/advertisement.interface';

@Injectable()
export class AdvertisementDeleteService {
  private db         = getFirestore();
  private collection = 'ads';

  // ── Hard delete ───────────────────────────────────
  // Permanently removes the ad document
  async deleteAd(
    adId: string,
    lenderId: string,
  ): Promise<{ message: string }> {

    const docRef  = this.db.collection(this.collection).doc(adId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new NotFoundException(`Ad ${adId} not found`);
    }

    const data = docSnap.data() as Advertisement;

    // ── Only owner can delete ────────────────────────
    if (data.lenderId !== lenderId) {
      throw new ForbiddenException(
        'You can only delete your own ads',
      );
    }

    // ── Cannot delete boosted ads ────────────────────
    // Must wait for boost to expire first
    if (data.isBoosted) {
      const now = admin.firestore.Timestamp.now();
      if (
        data.boostExpiry &&
        data.boostExpiry.toMillis() > now.toMillis()
      ) {
        throw new ForbiddenException(
          'Cannot delete a boosted ad before boost expires',
        );
      }
    }

    await docRef.delete();

    return { message: `Ad ${adId} deleted successfully` };
  }

  // ── Soft delete ───────────────────────────────────
  // Marks as expired instead of deleting
  // Better for keeping history
  async softDeleteAd(
    adId: string,
    lenderId: string,
  ): Promise<{ message: string }> {

    const docRef  = this.db.collection(this.collection).doc(adId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new NotFoundException(`Ad ${adId} not found`);
    }

    const data = docSnap.data() as Advertisement;

    if (data.lenderId !== lenderId) {
      throw new ForbiddenException(
        'You can only delete your own ads',
      );
    }

    await docRef.update({
      status:    'expired',
      updatedAt: admin.firestore.Timestamp.now(),
    });

    return { message: `Ad ${adId} removed successfully` };
  }
}