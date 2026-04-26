import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { getFirestore } from '../../../config/firebase.config';
import { Advertisement } from '../interfaces/advertisement.interface';

@Injectable()
export class AdvertisementAnalyticsService {
  private db         = getFirestore();
  private collection = 'ads';

  // ── Get full analytics for one ad ────────────────
  async getAdAnalytics(adId: string, lenderId: string) {
    const doc = await this.db
      .collection(this.collection)
      .doc(adId)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(`Ad ${adId} not found`);
    }

    const data = doc.data() as Advertisement;

    if (data.lenderId !== lenderId) {
      throw new ForbiddenException(
        'You can only view analytics for your own ads',
      );
    }

    const ctr =
      data.views > 0
        ? ((data.clicks / data.views) * 100).toFixed(1)
        : '0';

    const conversionRate =
      data.clicks > 0
        ? ((data.applicationCount / data.clicks) * 100).toFixed(1)
        : '0';

    const fundingRate =
      data.applicationCount > 0
        ? (
            (data.fundedLoansCount / data.applicationCount) *
            100
          ).toFixed(1)
        : '0';

    return {
      adId:              data.adId,
      title:             data.title,
      status:            data.status,
      isBoosted:         data.isBoosted,
      views:             data.views,
      clicks:            data.clicks,
      applicationCount:  data.applicationCount,
      fundedLoansCount:  data.fundedLoansCount,
      clickThroughRate:  `${ctr}%`,
      conversionRate:    `${conversionRate}%`,
      fundingRate:       `${fundingRate}%`,
      boostAmount:       data.boostAmount,
      boostExpiry:       data.boostExpiry
        ? data.boostExpiry.toDate().toISOString()
        : null,
      createdAt:         data.createdAt.toDate().toISOString(),
      expiresAt:         data.expiresAt.toDate().toISOString(),
    };
  }

  // ── Get analytics for ALL lender ads ─────────────
  async getLenderAnalytics(lenderId: string) {
    const snapshot = await this.db
      .collection(this.collection)
      .where('lenderId', '==', lenderId)
      .get();

    if (snapshot.empty) {
      return {
        totalAds:         0,
        activeAds:        0,
        pausedAds:        0,
        expiredAds:       0,
        boostedAds:       0,
        totalViews:       0,
        totalClicks:      0,
        totalApplications:0,
        totalFunded:      0,
        avgCTR:           '0%',
        totalBoostSpent:  0,
        ads:              [],
      };
    }

    const ads = snapshot.docs.map(
      (d) => d.data() as Advertisement,
    );

    const totalViews        = ads.reduce((s, a) => s + a.views, 0);
    const totalClicks       = ads.reduce((s, a) => s + a.clicks, 0);
    const totalApplications = ads.reduce((s, a) => s + a.applicationCount, 0);
    const totalFunded       = ads.reduce((s, a) => s + a.fundedLoansCount, 0);
    const totalBoostSpent   = ads.reduce((s, a) => s + a.boostAmount, 0);

    const avgCTR =
      totalViews > 0
        ? ((totalClicks / totalViews) * 100).toFixed(1)
        : '0';

    const now = admin.firestore.Timestamp.now();

    return {
      totalAds:          ads.length,
      activeAds:         ads.filter((a) => a.status === 'active').length,
      pausedAds:         ads.filter((a) => a.status === 'paused').length,
      expiredAds:        ads.filter(
        (a) => a.expiresAt.toMillis() < now.toMillis(),
      ).length,
      boostedAds:        ads.filter((a) => a.isBoosted).length,
      totalViews,
      totalClicks,
      totalApplications,
      totalFunded,
      avgCTR:            `${avgCTR}%`,
      totalBoostSpent,
      ads: ads.map((a) => ({
        adId:             a.adId,
        title:            a.title,
        status:           a.status,
        isBoosted:        a.isBoosted,
        views:            a.views,
        clicks:           a.clicks,
        applicationCount: a.applicationCount,
        fundedLoansCount: a.fundedLoansCount,
        ctr:
          a.views > 0
            ? `${((a.clicks / a.views) * 100).toFixed(1)}%`
            : '0%',
        createdAt:        a.createdAt.toDate().toISOString(),
        expiresAt:        a.expiresAt.toDate().toISOString(),
      })),
    };
  }

  // ── Track a view event ────────────────────────────
  async trackView(adId: string): Promise<void> {
    await this.db
      .collection(this.collection)
      .doc(adId)
      .update({
        views:     admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.Timestamp.now(),
      });
  }

  // ── Track a click event ───────────────────────────
  async trackClick(adId: string): Promise<void> {
    await this.db
      .collection(this.collection)
      .doc(adId)
      .update({
        clicks:    admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.Timestamp.now(),
      });
  }

  // ── Increment application count ───────────────────
  async trackApplication(adId: string): Promise<void> {
    await this.db
      .collection(this.collection)
      .doc(adId)
      .update({
        applicationCount: admin.firestore.FieldValue.increment(1),
        updatedAt:        admin.firestore.Timestamp.now(),
      });
  }

  // ── Increment funded count ────────────────────────
  async trackFunded(adId: string): Promise<void> {
    await this.db
      .collection(this.collection)
      .doc(adId)
      .update({
        fundedLoansCount: admin.firestore.FieldValue.increment(1),
        updatedAt:        admin.firestore.Timestamp.now(),
      });
  }
}