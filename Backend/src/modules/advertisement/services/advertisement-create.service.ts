import { Injectable, BadRequestException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { CreateAdDto } from '../dto/create-ad.dto';
import { Advertisement, AdvertisementResponse } from '../interfaces/advertisement.interface';

@Injectable()
export class AdvertisementCreateService {
  private db = getFirestore();
  private collection = 'ads';

  async createAd(
    lenderId: string,
    dto: CreateAdDto,
  ): Promise<AdvertisementResponse> {

    // ── Validate amounts ────────────────────────────
    if (dto.minAmount >= dto.maxAmount) {
      throw new BadRequestException(
        'Maximum amount must be greater than minimum amount',
      );
    }

    if (dto.minTenureMonths > dto.maxTenureMonths) {
      throw new BadRequestException(
        'Maximum tenure must be greater than or equal to minimum tenure',
      );
    }

    // ── Get lender info ─────────────────────────────
    const lenderDoc = await this.db
      .collection('users')
      .doc(lenderId)
      .get();

    if (!lenderDoc.exists) {
      throw new BadRequestException('Lender not found');
    }

    const lenderData = lenderDoc.data()!;

    if (!lenderData.role?.includes('lender')) {
      throw new BadRequestException('User is not a lender');
    }

    // ── Build search keywords ────────────────────────
    const keywords        = dto.searchKeywords || [];
    const locationKeyword = dto.location.toLowerCase();
    const purposeKeywords = dto.preferredPurposes.map((p) => p.toLowerCase());
    const nameKeywords    = lenderData.fullName
      .toLowerCase()
      .split(' ')
      .filter((w: string) => w.length > 2);

    const allKeywords = [
      ...new Set([
        locationKeyword,
        ...nameKeywords,
        ...purposeKeywords,
        ...keywords,
      ]),
    ];

    // ── Build ad document ────────────────────────────
    const now       = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(dto.expiresAt),
    );

    const adRef = this.db.collection(this.collection).doc();

    const adData: Advertisement = {
      adId:                  adRef.id,
      lenderId,
      lenderName:            lenderData.fullName,
      lenderPhotoURL:        lenderData.photoURL   || '',
      lenderRating:          lenderData.rating     || 0,
      title:                 dto.title,
      description:           dto.description,
      imageUrl:              dto.imageUrl          || '',
      minAmount:             dto.minAmount,
      maxAmount:             dto.maxAmount,
      preferredInterestRate: dto.preferredInterestRate,
      minTenureMonths:       dto.minTenureMonths,
      maxTenureMonths:       dto.maxTenureMonths,
      preferredPurposes:     dto.preferredPurposes,
      availableCapital:      dto.availableCapital,
      responseTimeHours:     dto.responseTimeHours,
      location:              dto.location,
      searchKeywords:        allKeywords,

      // ✅ CHANGED: starts as 'pending' — admin must approve before it goes live
      status:                'pending',

      isBoosted:             false,
      boostExpiry:           null,
      boostPaidAt:           null,
      boostAmount:           0,
      views:                 0,
      clicks:                0,
      applicationCount:      0,
      fundedLoansCount:      0,
      createdAt:             now,
      updatedAt:             now,
      expiresAt,
      source:                'lender_created',
    };

    await adRef.set(adData);

    return this.toResponse(adData);
  }

  // ── Convert Firestore doc to API response ─────────
  toResponse(data: Advertisement): AdvertisementResponse {
    return {
      adId:                  data.adId,
      lenderId:              data.lenderId,
      lenderName:            data.lenderName,
      lenderPhotoURL:        data.lenderPhotoURL,
      lenderRating:          data.lenderRating,
      title:                 data.title,
      description:           data.description,
      imageUrl:              data.imageUrl,
      minAmount:             data.minAmount,
      maxAmount:             data.maxAmount,
      preferredInterestRate: data.preferredInterestRate,
      minTenureMonths:       data.minTenureMonths,
      maxTenureMonths:       data.maxTenureMonths,
      preferredPurposes:     data.preferredPurposes,
      availableCapital:      data.availableCapital,
      responseTimeHours:     data.responseTimeHours,
      location:              data.location,
      searchKeywords:        data.searchKeywords,
      status:                data.status,
      isBoosted:             data.isBoosted,
      boostExpiry:           data.boostExpiry
        ? data.boostExpiry.toDate().toISOString()
        : null,
      boostAmount:           data.boostAmount,
      views:                 data.views,
      clicks:                data.clicks,
      applicationCount:      data.applicationCount,
      fundedLoansCount:      data.fundedLoansCount,
      createdAt:             data.createdAt.toDate().toISOString(),
      updatedAt:             data.updatedAt.toDate().toISOString(),
      expiresAt:             data.expiresAt.toDate().toISOString(),
    };
  }
}