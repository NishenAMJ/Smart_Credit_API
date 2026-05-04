import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { UpdateAdDto } from '../dto/update-ad.dto';
import { Advertisement, AdvertisementResponse } from '../interfaces/advertisement.interface';
import { AdvertisementCreateService } from './advertisement-create.service';

@Injectable()
export class AdvertisementUpdateService {
  private db = getFirestore();
  private collection = 'ads';

  constructor(
    private createService: AdvertisementCreateService,
  ) { }

  async updateAd(
    adId: string,
    lenderId: string,
    dto: UpdateAdDto,
  ): Promise<AdvertisementResponse> {

    //  Check ad exists 
    const docRef = this.db.collection(this.collection).doc(adId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new NotFoundException(`Ad ${adId} not found`);
    }

    const existing = docSnap.data() as Advertisement;

    //  Check ownership 
    if (existing.lenderId !== lenderId) {
      throw new ForbiddenException(
        'You can only edit your own ads',
      );
    }

    //  Validate amounts if both provided 
    const newMin = dto.minAmount ?? existing.minAmount;
    const newMax = dto.maxAmount ?? existing.maxAmount;

    if (newMin >= newMax) {
      throw new BadRequestException(
        'Maximum amount must be greater than minimum amount',
      );
    }

    //  Validate tenure if both provided 
    const newMinTenure = dto.minTenureMonths ?? existing.minTenureMonths;
    const newMaxTenure = dto.maxTenureMonths ?? existing.maxTenureMonths;

    if (newMinTenure > newMaxTenure) {
      throw new BadRequestException(
        'Maximum tenure must be >= minimum tenure',
      );
    }

    //  Build update payload 
    // Only update fields that were provided in the DTO
    const updatePayload: Partial<Advertisement> & {
      updatedAt: admin.firestore.Timestamp;
    } = {
      updatedAt: admin.firestore.Timestamp.now(),
    };

    if (dto.title !== undefined) updatePayload.title = dto.title;
    if (dto.description !== undefined) updatePayload.description = dto.description;
    if (dto.imageUrl !== undefined) updatePayload.imageUrl = dto.imageUrl;
    if (dto.minAmount !== undefined) updatePayload.minAmount = dto.minAmount;
    if (dto.maxAmount !== undefined) updatePayload.maxAmount = dto.maxAmount;
    if (dto.preferredInterestRate !== undefined) updatePayload.preferredInterestRate = dto.preferredInterestRate;
    if (dto.minTenureMonths !== undefined) updatePayload.minTenureMonths = dto.minTenureMonths;
    if (dto.maxTenureMonths !== undefined) updatePayload.maxTenureMonths = dto.maxTenureMonths;
    if (dto.preferredPurposes !== undefined) updatePayload.preferredPurposes = dto.preferredPurposes;
    if (dto.availableCapital !== undefined) updatePayload.availableCapital = dto.availableCapital;
    if (dto.responseTimeHours !== undefined) updatePayload.responseTimeHours = dto.responseTimeHours;
    if (dto.location !== undefined) updatePayload.location = dto.location;
    if (dto.searchKeywords !== undefined) updatePayload.searchKeywords = dto.searchKeywords;
    if (dto.status !== undefined) updatePayload.status = dto.status;

    if (dto.expiresAt !== undefined) {
      updatePayload.expiresAt = admin.firestore.Timestamp.fromDate(
        new Date(dto.expiresAt),
      );
    }

    //  Save update 
    await docRef.update(updatePayload);

    // Return updated doc
    const updated = await docRef.get();
    return this.createService.toResponse(
      updated.data() as Advertisement,
    );
  }

  //  Pause ad 
  async pauseAd(
    adId: string,
    lenderId: string,
  ): Promise<{ message: string }> {

    const docRef = this.db.collection(this.collection).doc(adId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new NotFoundException(`Ad ${adId} not found`);
    }

    const data = docSnap.data() as Advertisement;

    if (data.lenderId !== lenderId) {
      throw new ForbiddenException('You can only pause your own ads');
    }

    await docRef.update({
      status: 'paused',
      updatedAt: admin.firestore.Timestamp.now(),
    });

    return { message: 'Ad paused successfully' };
  }

  //  Activate ad 
  async activateAd(
    adId: string,
    lenderId: string,
  ): Promise<{ message: string }> {

    const docRef = this.db.collection(this.collection).doc(adId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new NotFoundException(`Ad ${adId} not found`);
    }

    const data = docSnap.data() as Advertisement;

    if (data.lenderId !== lenderId) {
      throw new ForbiddenException('You can only activate your own ads');
    }

    // Check if ad has expired
    const now = admin.firestore.Timestamp.now();
    if (data.expiresAt.toMillis() < now.toMillis()) {
      throw new BadRequestException(
        'Cannot activate an expired ad. Please update the expiry date first.',
      );
    }

    await docRef.update({
      status: 'active',
      updatedAt: admin.firestore.Timestamp.now(),
    });

    return { message: 'Ad activated successfully' };
  }
}