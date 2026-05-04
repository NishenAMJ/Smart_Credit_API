// Advertisement read service handles searching and fetching ads
// Supports filtering by location, purpose, amount, and search keywords

import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import {
  Advertisement,
  AdvertisementResponse,
} from '../interfaces/advertisement.interface';
import { AdvertisementCreateService } from './advertisement-create.service';

@Injectable()
export class AdvertisementReadService {
  private db = getFirestore();
  private collection = 'ads';

  constructor(
    private createService: AdvertisementCreateService,
  ) { }

  // Get all active ads with optional filters
  // Boosted ads appear first, then sorted by newest
  async getAllActiveAds(filters?: {
    location?: string;
    purpose?: string;
    minAmount?: number;
    maxAmount?: number;
    search?: string;
  }): Promise<AdvertisementResponse[]> {

    const now = admin.firestore.Timestamp.now();

    // Start with only active, non-expired ads
    let query = this.db
      .collection(this.collection)
      .where('status', '==', 'active')
      .where('expiresAt', '>', now);

    // Add location filter if provided
    if (filters?.location) {
      query = query.where('location', '==', filters.location);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return [];
    }

    let ads = snapshot.docs.map((doc) =>
      doc.data() as Advertisement
    );

    // Apply client-side filters that Firestore can't do efficiently
    // Purpose filter - check if ad accepts this loan purpose
    if (filters?.purpose) {
      ads = ads.filter((ad) =>
        ad.preferredPurposes.includes(filters.purpose!)
      );
    }

    // Amount range filters - check if ad can handle this loan amount
    if (filters?.minAmount !== undefined) {
      ads = ads.filter((ad) =>
        ad.maxAmount >= filters.minAmount!
      );
    }

    if (filters?.maxAmount !== undefined) {
      ads = ads.filter((ad) =>
        ad.minAmount <= filters.maxAmount!
      );
    }

    // Search filter - match keywords, title, or location
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      ads = ads.filter((ad) =>
        ad.searchKeywords?.some((kw) =>
          kw.toLowerCase().includes(searchLower)
        ) ||
        ad.title.toLowerCase().includes(searchLower) ||
        ad.location.toLowerCase().includes(searchLower)
      );
    }

    // Sort: boosted ads first, then by newest
    ads.sort((a, b) => {
      if (a.isBoosted && !b.isBoosted) return -1;
      if (!a.isBoosted && b.isBoosted) return 1;
      return (
        b.createdAt.toMillis() - a.createdAt.toMillis()
      );
    });

    return ads.map((ad) => this.createService.toResponse(ad));
  }

  //  Get lender's own ads 
  async getMyAds(lenderId: string): Promise<AdvertisementResponse[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('lenderId', '==', lenderId)
      .orderBy('createdAt', 'desc')
      .get();

    if (snapshot.empty) return [];

    return snapshot.docs.map((doc) => {
      const data = doc.data() as Advertisement;
      return this.createService.toResponse(data);
    });
  }

  // Get single ad by ID 
  async getAdById(adId: string): Promise<AdvertisementResponse> {
    const doc = await this.db
      .collection(this.collection)
      .doc(adId)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(`Ad with ID ${adId} not found`);
    }

    const data = doc.data() as Advertisement;
    return this.createService.toResponse(data);
  }

  //  Get ads by lender ID (public — hides private stats) 
  async getAdsByLender(lenderId: string): Promise<AdvertisementResponse[]> {
    const now = admin.firestore.Timestamp.now();

    const snapshot = await this.db
      .collection(this.collection)
      .where('lenderId', '==', lenderId)
      .where('status', '==', 'active')
      .where('expiresAt', '>', now)
      .get();

    if (snapshot.empty) return [];

    return snapshot.docs.map((doc) => {
      const data = doc.data() as Advertisement;

      //  Hide private analytics from other users
      // Views and clicks are private to the lender
      const response = this.createService.toResponse(data);
      response.views = 0;
      response.clicks = 0;
      return response;
    });
  }

  //  Increment views 
  async incrementViews(adId: string): Promise<void> {
    await this.db
      .collection(this.collection)
      .doc(adId)
      .update({
        views: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.Timestamp.now(),
      });
  }

  //  Increment clicks 
  async incrementClicks(adId: string): Promise<void> {
    await this.db
      .collection(this.collection)
      .doc(adId)
      .update({
        clicks: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.Timestamp.now(),
      });
  }

  //  Get analytics for lender's own ad 
  async getAdAnalytics(
    adId: string,
    lenderId: string,
  ): Promise<any> {
    const doc = await this.db
      .collection(this.collection)
      .doc(adId)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(`Ad ${adId} not found`);
    }

    const data = doc.data() as Advertisement;

    //  Only lender can see their own analytics
    if (data.lenderId !== lenderId) {
      throw new NotFoundException('Ad not found');
    }

    // Calculate click-through rate
    const ctr = data.views > 0
      ? ((data.clicks / data.views) * 100).toFixed(1) + '%'
      : '0%';

    return {
      views: data.views,
      clicks: data.clicks,
      applicationCount: data.applicationCount,
      fundedLoansCount: data.fundedLoansCount,
      clickThroughRate: ctr,
    };
  }
}