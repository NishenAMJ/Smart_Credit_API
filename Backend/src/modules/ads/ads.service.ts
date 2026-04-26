import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import { FirebaseService } from '../../firebase/firebase.service';
import { Ad } from './interfaces/ad.interface';
import { rethrowFirebaseError } from '../../common/firebase-error';

type ModerationStatus = 'pending' | 'approved' | 'rejected';

@Injectable()
export class AdsService {
  constructor(private readonly firebaseService: FirebaseService) {}

  private mapAd(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot): Ad {
    return {
      id: doc.id,
      ...doc.data(),
    } as Ad;
  }

  private async getLenderAdDoc(adId: string) {
    const db = this.firebaseService.db;
    const adDoc = await db.collection('ads').doc(adId).get();

    if (!adDoc.exists || !adDoc.data()?.lenderId) {
      throw new NotFoundException('Lender ad not found');
    }

    return adDoc;
  }

  async getAllAds(): Promise<{ success: boolean; count: number; ads: Ad[] }> {
    try {
      const db = this.firebaseService.db;
      const snapshot = await db.collection('ads').where('lenderId', '!=', null).get();

      const ads: Ad[] = snapshot.docs.map((doc) => this.mapAd(doc));

      return {
        success: true,
        count: ads.length,
        ads,
      };
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to fetch ads');
    }
  }

  async getPendingAds(): Promise<{
    success: boolean;
    count: number;
    ads: Ad[];
  }> {
    try {
      const db = this.firebaseService.db;
      const adsRef = db.collection('ads');

      const snapshot = await adsRef
        .where('lenderId', '!=', null)
        .where('status', '==', 'pending')
        .get();

      const ads: Ad[] = snapshot.docs.map((doc) => this.mapAd(doc));

      return {
        success: true,
        count: ads.length,
        ads,
      };
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to fetch pending ads');
    }
  }

  async getAdById(adId: string): Promise<Ad> {
    try {
      const adDoc = await this.getLenderAdDoc(adId);
      return this.mapAd(adDoc);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      rethrowFirebaseError(error, 'Failed to fetch ad');
    }
  }

  async approveAd(
    adId: string,
    notes?: string,
  ): Promise<{ success: boolean; message: string; adId: string }> {
    try {
      const db = this.firebaseService.db;
      const adRef = db.collection('ads').doc(adId);
      await this.getLenderAdDoc(adId);

      const updateData: any = {
        status: 'approved',
        reviewedAt: new Date(),
        approvedAt: new Date(),
        updatedAt: new Date(),
      };

      if (notes) {
        updateData.notes = notes;
      }

      await adRef.update(updateData);

      return {
        success: true,
        message: 'Ad approved successfully',
        adId,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      rethrowFirebaseError(error, 'Failed to approve ad');
    }
  }

  async rejectAd(
    adId: string,
    reason: string,
  ): Promise<{ success: boolean; message: string; adId: string }> {
    try {
      const db = this.firebaseService.db;
      const adRef = db.collection('ads').doc(adId);
      await this.getLenderAdDoc(adId);

      await adRef.update({
        status: 'rejected',
        rejectionReason: reason,
        reviewedAt: new Date(),
        rejectedAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        success: true,
        message: 'Ad rejected successfully',
        adId,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      rethrowFirebaseError(error, 'Failed to reject ad');
    }
  }

  async updateAdStatus(
    adId: string,
    status: ModerationStatus,
    options: { reason?: string; notes?: string } = {},
  ): Promise<{ success: boolean; message: string; adId: string; status: ModerationStatus }> {
    try {
      if (status === 'rejected' && !options.reason?.trim()) {
        throw new BadRequestException('Rejection reason is required');
      }

      const db = this.firebaseService.db;
      const adRef = db.collection('ads').doc(adId);
      await this.getLenderAdDoc(adId);

      const updateData: Record<string, unknown> = {
        status,
        reviewedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (status === 'approved') {
        updateData.approvedAt = FieldValue.serverTimestamp();
        updateData.rejectedAt = FieldValue.delete();
        updateData.rejectionReason = FieldValue.delete();
        if (options.notes?.trim()) {
          updateData.notes = options.notes.trim();
        }
      }

      if (status === 'rejected') {
        updateData.rejectedAt = FieldValue.serverTimestamp();
        updateData.rejectionReason = options.reason!.trim();
      }

      if (status === 'pending') {
        updateData.reviewedAt = FieldValue.delete();
        updateData.approvedAt = FieldValue.delete();
        updateData.rejectedAt = FieldValue.delete();
        updateData.rejectionReason = FieldValue.delete();
        updateData.notes = options.notes?.trim() || 'Moved back to pending review by admin';
      }

      await adRef.update(updateData);

      return {
        success: true,
        message: `Ad moved to ${status} successfully`,
        adId,
        status,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      rethrowFirebaseError(error, 'Failed to update ad status');
    }
  }

  async deleteAd(adId: string): Promise<{ success: boolean; message: string }> {
    try {
      const db = this.firebaseService.db;
      const adRef = db.collection('ads').doc(adId);
      await this.getLenderAdDoc(adId);

      await adRef.delete();

      return {
        success: true,
        message: 'Ad deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      rethrowFirebaseError(error, 'Failed to delete ad');
    }
  }
}
