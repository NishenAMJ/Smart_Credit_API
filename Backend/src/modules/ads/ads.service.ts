import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { Ad } from './interfaces/ad.interface';

@Injectable()
export class AdsService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async getPendingAds(): Promise<{ success: boolean; count: number; ads: Ad[] }> {
    try {
      const db = this.firebaseService.db;
      const adsRef = db.collection('ads');
      
      const snapshot = await adsRef
        .where('status', '==', 'pending')
        .get();

      const ads: Ad[] = [];
      snapshot.forEach((doc) => {
        ads.push({
          id: doc.id,
          ...doc.data(),
        } as Ad);
      });

      return {
        success: true,
        count: ads.length,
        ads,
      };
    } catch (error) {
      throw new Error(`Failed to fetch pending ads: ${error.message}`);
    }
  }

  async getAdById(adId: string): Promise<Ad> {
    try {
      const db = this.firebaseService.db;
      const adDoc = await db.collection('ads').doc(adId).get();

      if (!adDoc.exists) {
        throw new NotFoundException('Ad not found');
      }

      return {
        id: adDoc.id,
        ...adDoc.data(),
      } as Ad;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to fetch ad: ${error.message}`);
    }
  }

  async approveAd(adId: string, notes?: string): Promise<{ success: boolean; message: string; adId: string }> {
    try {
      const db = this.firebaseService.db;
      const adRef = db.collection('ads').doc(adId);
      const adDoc = await adRef.get();

      if (!adDoc.exists) {
        throw new NotFoundException('Ad not found');
      }

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
      throw new Error(`Failed to approve ad: ${error.message}`);
    }
  }

  async rejectAd(adId: string, reason: string): Promise<{ success: boolean; message: string; adId: string }> {
    try {
      const db = this.firebaseService.db;
      const adRef = db.collection('ads').doc(adId);
      const adDoc = await adRef.get();

      if (!adDoc.exists) {
        throw new NotFoundException('Ad not found');
      }

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
      throw new Error(`Failed to reject ad: ${error.message}`);
    }
  }

  async deleteAd(adId: string): Promise<{ success: boolean; message: string }> {
    try {
      const db = this.firebaseService.db;
      const adRef = db.collection('ads').doc(adId);
      const adDoc = await adRef.get();

      if (!adDoc.exists) {
        throw new NotFoundException('Ad not found');
      }

      await adRef.delete();

      return {
        success: true,
        message: 'Ad deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to delete ad: ${error.message}`);
    }
  }
}


