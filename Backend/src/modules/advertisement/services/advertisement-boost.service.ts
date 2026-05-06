import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { BoostAdDto } from '../dto/boost-ad.dto';
import { Advertisement, AdvertisementResponse } from '../interfaces/advertisement.interface';
import { AdvertisementCreateService } from './advertisement-create.service';

// Boost package durations in days
const BOOST_PACKAGES = {
  '7days': { days: 7, price: 500 },
  '14days': { days: 14, price: 1000 },
  '30days': { days: 30, price: 2000 },
};

@Injectable()
export class AdvertisementBoostService {
  private db = getFirestore();
  private collection = 'ads';

  constructor(
    private createService: AdvertisementCreateService,
  ) { }

  // Apply boost package to an ad to increase visibility
  // Verifies ownership, validates payment amount, calculates expiry date based on package duration
  async boostAd(
    adId: string,
    lenderId: string,
    dto: BoostAdDto,
  ): Promise<AdvertisementResponse> {

    const docRef = this.db.collection(this.collection).doc(adId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new NotFoundException(`Ad ${adId} not found`);
    }

    const data = docSnap.data() as Advertisement;

    // Only the ad owner can boost their own ad
    if (data.lenderId !== lenderId) {
      throw new ForbiddenException(
        'You can only boost your own ads',
      );
    }

    // Can't boost ads that are paused, completed, or deleted
    if (data.status !== 'active') {
      throw new BadRequestException(
        'Only active ads can be boosted',
      );
    }

    // Check if already boosted with active expiry - can't overlap boosts
    if (data.isBoosted) {
      const now = admin.firestore.Timestamp.now();
      if (
        data.boostExpiry &&
        data.boostExpiry.toMillis() > now.toMillis()
      ) {
        throw new BadRequestException(
          'This ad is already boosted. Wait for current boost to expire.',
        );
      }
    }

    // Ensure the package exists and payment is sufficient
    const pkg = BOOST_PACKAGES[dto.package as keyof typeof BOOST_PACKAGES];
    if (!pkg) {
      throw new BadRequestException('Invalid boost package');
    }

    if (dto.amount < pkg.price) {
      throw new BadRequestException(
        `Package "${dto.package}" requires LKR ${pkg.price}. Provided: LKR ${dto.amount}`,
      );
    }

    // Calculate when the boost will expire based on package duration
    const now = admin.firestore.Timestamp.now();
    const boostExpiry = new Date(now.toDate());
    boostExpiry.setDate(boostExpiry.getDate() + pkg.days);

    // Update the ad to mark it as boosted with expiry timestamp and payment info
    await docRef.update({
      isBoosted: true,
      boostExpiry: admin.firestore.Timestamp.fromDate(boostExpiry),
      boostPaidAt: now,
      boostAmount: dto.amount,
      updatedAt: now,
    });

    // Create a payment record in admin collection for revenue tracking and refunds
    await this.db.collection('boostPayments').add({
      adId,
      lenderId,
      package: dto.package,
      amount: dto.amount,
      paymentReference: dto.paymentReference,
      boostStartAt: now,
      boostExpiry: admin.firestore.Timestamp.fromDate(boostExpiry),
      status: 'confirmed',
      createdAt: now,
    });

    // Return the updated ad with all boost metadata
    const updated = await docRef.get();
    return this.createService.toResponse(
      updated.data() as Advertisement,
    );
  }

  // Remove active boost from an ad before expiry date
  // Clears the isBoosted flag and removes the expiry timestamp
  async cancelBoost(
    adId: string,
    lenderId: string,
  ): Promise<{ message: string }> {

    const docRef = this.db.collection(this.collection).doc(adId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new NotFoundException(`Ad ${adId} not found`);
    }

    const data = docSnap.data() as Advertisement;

    // Only the ad owner can cancel their own boost
    if (data.lenderId !== lenderId) {
      throw new ForbiddenException('You can only cancel your own boost');
    }

    // Can't cancel a boost that doesn't exist
    if (!data.isBoosted) {
      throw new BadRequestException('This ad is not boosted');
    }

    // Clear the boost status and expiry
    await docRef.update({
      isBoosted: false,
      boostExpiry: null,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    return { message: 'Boost cancelled successfully' };
  }

  //  Get boost packages info 
  getBoostPackages() {
    return Object.entries(BOOST_PACKAGES).map(([key, val]) => ({
      package: key,
      days: val.days,
      price: val.price,
      description: `Boost your ad for ${val.days} days — LKR ${val.price}`,
    }));
  }
}