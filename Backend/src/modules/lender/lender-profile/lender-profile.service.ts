import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import { hasRole, readDate } from '../../../firebase/firestore-query.utils';
import {
  LenderProfileResponse,
  UpdateLenderProfileInput,
} from './lender-profile.types';

@Injectable()
export class LenderProfileService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async getProfile(lenderId: string): Promise<LenderProfileResponse> {
    const snapshot = await this.firebaseService
      .getDb()
      .collection('users')
      .doc(lenderId)
      .get();

    if (!snapshot.exists) {
      throw new NotFoundException(`Lender ${lenderId} was not found.`);
    }

    const data = snapshot.data();

    if (!data || !hasRole(data.role, 'lender')) {
      throw new NotFoundException(`Lender ${lenderId} was not found.`);
    }

    return this.mapProfile(lenderId, data);
  }

  async updateProfile(
    lenderId: string,
    input: UpdateLenderProfileInput,
  ): Promise<LenderProfileResponse> {
    this.validateInput(input);

    const docRef = this.firebaseService
      .getDb()
      .collection('users')
      .doc(lenderId);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      throw new NotFoundException(`Lender ${lenderId} was not found.`);
    }

    const data = snapshot.data();

    if (!data || !hasRole(data.role, 'lender')) {
      throw new NotFoundException(`Lender ${lenderId} was not found.`);
    }

    const updates = {
      fullName: input.fullName.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      address: input.address.trim(),
      city: input.city.trim(),
      district: input.district.trim(),
      businessName: input.businessName.trim(),
      responseTimeHours: input.responseTimeHours,
      preferredRegions: this.uniqueRegions(input.preferredRegions),
      updatedAt: Timestamp.now(),
      searchKeywords: this.buildSearchKeywords([
        input.fullName,
        input.businessName,
        input.city,
        input.district,
      ]),
    };

    await docRef.update(updates);
    const updatedSnapshot = await docRef.get();

    return this.mapProfile(
      lenderId,
      updatedSnapshot.data() ?? { ...data, ...updates },
    );
  }

  private validateInput(input: UpdateLenderProfileInput): void {
    if (input.fullName.trim().length < 3) {
      throw new BadRequestException('fullName must be at least 3 characters.');
    }

    if (!input.email.includes('@')) {
      throw new BadRequestException('email must be valid.');
    }

    if (input.businessName.trim().length < 3) {
      throw new BadRequestException(
        'businessName must be at least 3 characters.',
      );
    }

    if (input.city.trim().length < 2 || input.district.trim().length < 2) {
      throw new BadRequestException('city and district are required.');
    }

    if (input.responseTimeHours <= 0 || input.responseTimeHours > 72) {
      throw new BadRequestException(
        'responseTimeHours must be between 1 and 72.',
      );
    }
  }

  private mapProfile(
    lenderId: string,
    data: Record<string, unknown>,
  ): LenderProfileResponse {
    return {
      id: lenderId,
      lenderId,
      fullName:
        typeof data.fullName === 'string' && data.fullName.trim().length > 0
          ? data.fullName
          : 'Unnamed lender',
      email: typeof data.email === 'string' ? data.email : 'No email',
      phone: typeof data.phone === 'string' ? data.phone : null,
      address: typeof data.address === 'string' ? data.address : null,
      city: typeof data.city === 'string' ? data.city : null,
      district: typeof data.district === 'string' ? data.district : null,
      businessName:
        typeof data.businessName === 'string' ? data.businessName : null,
      businessRegistrationNo:
        typeof data.businessRegistrationNo === 'string'
          ? data.businessRegistrationNo
          : null,
      kycStatus:
        typeof data.kycStatus === 'string' ? data.kycStatus : 'unknown',
      responseTimeHours:
        typeof data.responseTimeHours === 'number' &&
        Number.isFinite(data.responseTimeHours)
          ? data.responseTimeHours
          : 24,
      preferredRegions: Array.isArray(data.preferredRegions)
        ? data.preferredRegions.filter(
            (value): value is string => typeof value === 'string',
          )
        : [],
      availableCapital:
        typeof data.availableCapital === 'number' &&
        Number.isFinite(data.availableCapital)
          ? data.availableCapital
          : 0,
      rating:
        typeof data.rating === 'number' && Number.isFinite(data.rating)
          ? data.rating
          : null,
      profilePhotoUrl:
        typeof data.profilePhotoUrl === 'string' ? data.profilePhotoUrl : null,
      updatedAt: this.toIsoString(data.updatedAt),
      totalLoaned:
        typeof data.totalAmountLent === 'number' ? data.totalAmountLent : 0,
      totalReturned:
        typeof data.totalAmountReturned === 'number'
          ? data.totalAmountReturned
          : 0,
      totalLoansCompleted:
        typeof data.totalLoansCompleted === 'number'
          ? data.totalLoansCompleted
          : 0,
    };
  }

  private uniqueRegions(values: string[]): string[] {
    return Array.from(
      new Set(
        values.map((value) => value.trim()).filter((value) => value.length > 0),
      ),
    );
  }

  private buildSearchKeywords(values: string[]): string[] {
    return Array.from(
      new Set(
        values
          .flatMap((value) => value.toLowerCase().split(/[^a-z0-9]+/))
          .filter((token) => token.length > 1),
      ),
    );
  }

  private toIsoString(value: unknown): string | null {
    return readDate(value)?.toISOString() ?? null;
  }
}
