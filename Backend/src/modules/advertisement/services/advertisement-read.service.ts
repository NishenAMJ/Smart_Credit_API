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
  private db         = getFirestore();
  private collection = 'ads';

  constructor(private createService: AdvertisementCreateService) {}

  // ── Get all ACTIVE ads (borrowers) ───────────────
  // ✅ Only status='active' ads are shown — pending/rejected never appear
  async getAllActiveAds(filters?: {
    location?: string;
    purpose?: string;
    minAmount?: number;
    maxAmount?: number;
    search?: string;
  }): Promise<AdvertisementResponse[]> {

    const now = admin.firestore.Timestamp.now();

    let query = this.db
      .collection(this.collection)
      .where('status', '==', 'active')       // ✅ only approved ads
      .where('expiresAt', '>', now);

    if (filters?.location) {
      query = query.where('location', '==', filters.location);
    }

    const snapshot = await query.get();
    if (snapshot.empty) return [];

    let ads = snapshot.docs.map((doc) => doc.data() as Advertisement);

    if (filters?.purpose) {
      ads = ads.filter((ad) => ad.preferredPurposes.includes(filters.purpose!));
    }
    if (filters?.minAmount !== undefined) {
      ads = ads.filter((ad) => ad.maxAmount >= filters.minAmount!);
    }
    if (filters?.maxAmount !== undefined) {
      ads = ads.filter((ad) => ad.minAmount <= filters.maxAmount!);
    }
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      ads = ads.filter((ad) =>
        ad.searchKeywords?.some((kw) => kw.toLowerCase().includes(s)) ||
        ad.title.toLowerCase().includes(s) ||
        ad.location.toLowerCase().includes(s),
      );
    }

    ads.sort((a, b) => {
      if (a.isBoosted && !b.isBoosted) return -1;
      if (!a.isBoosted && b.isBoosted) return 1;
      return b.createdAt.toMillis() - a.createdAt.toMillis();
    });

    return ads.map((ad) => this.createService.toResponse(ad));
  }

  // ── Get lender's OWN ads ─────────────────────────
  // ✅ Shows ALL statuses including pending/rejected so lender can see state
  async getMyAds(lenderId: string): Promise<AdvertisementResponse[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('lenderId', '==', lenderId)
      .orderBy('createdAt', 'desc')
      .get();

    if (snapshot.empty) return [];

    return snapshot.docs.map((doc) =>
      this.createService.toResponse(doc.data() as Advertisement),
    );
  }

  // ── Get single ad by ID ──────────────────────────
  async getAdById(adId: string): Promise<AdvertisementResponse> {
    const doc = await this.db.collection(this.collection).doc(adId).get();

    if (!doc.exists) {
      throw new NotFoundException(`Ad with ID ${adId} not found`);
    }

    return this.createService.toResponse(doc.data() as Advertisement);
  }

  // ── Get ads by lender (public) ───────────────────
  // ✅ Only active ads shown publicly
  async getAdsByLender(lenderId: string): Promise<AdvertisementResponse[]> {
    const now = admin.firestore.Timestamp.now();

    const snapshot = await this.db
      .collection(this.collection)
      .where('lenderId',  '==', lenderId)
      .where('status',    '==', 'active')    // ✅ only approved
      .where('expiresAt', '>',  now)
      .get();

    if (snapshot.empty) return [];

    return snapshot.docs.map((doc) => {
      const response  = this.createService.toResponse(doc.data() as Advertisement);
      response.views  = 0;
      response.clicks = 0;
      return response;
    });
  }

  // ── Increment views ──────────────────────────────
  async incrementViews(adId: string): Promise<void> {
    await this.db.collection(this.collection).doc(adId).update({
      views:     admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.Timestamp.now(),
    });
  }

  // ── Increment clicks ─────────────────────────────
  async incrementClicks(adId: string): Promise<void> {
    await this.db.collection(this.collection).doc(adId).update({
      clicks:    admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.Timestamp.now(),
    });
  }

  // ── Ad analytics for lender ──────────────────────
  async getAdAnalytics(adId: string, lenderId: string): Promise<any> {
    const doc = await this.db.collection(this.collection).doc(adId).get();

    if (!doc.exists) throw new NotFoundException(`Ad ${adId} not found`);

    const data = doc.data() as Advertisement;

    if (data.lenderId !== lenderId) throw new NotFoundException('Ad not found');

    const ctr = data.views > 0
      ? ((data.clicks / data.views) * 100).toFixed(1) + '%'
      : '0%';

    return {
      views:            data.views,
      clicks:           data.clicks,
      applicationCount: data.applicationCount,
      fundedLoansCount: data.fundedLoansCount,
      clickThroughRate: ctr,
    };
  }
}