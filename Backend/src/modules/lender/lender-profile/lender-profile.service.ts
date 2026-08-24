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

    if (!data || !hasRole(data.roles ?? data.role, 'lender')) {
      throw new NotFoundException(`Lender ${lenderId} was not found.`);
    }

    return this.mapProfile(lenderId, data);
  }

  async updateProfile(
    lenderId: string,
    input: UpdateLenderProfileInput,
  ): Promise<LenderProfileResponse> {
    const docRef = this.firebaseService
      .getDb()
      .collection('users')
      .doc(lenderId);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      throw new NotFoundException(`Lender ${lenderId} was not found.`);
    }

    const data = snapshot.data();

    if (!data || !hasRole(data.roles ?? data.role, 'lender')) {
      throw new NotFoundException(`Lender ${lenderId} was not found.`);
    }

    this.validateInput(input);
    const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };
    if (input.fullName !== undefined) updates.fullName = input.fullName.trim();
    if (input.email !== undefined)
      updates.email = input.email.trim().toLowerCase();
    if (input.phone !== undefined) updates.phone = input.phone.trim();
    const currentAddress = this.readAddress(data);
    if (
      input.address !== undefined ||
      input.city !== undefined ||
      input.district !== undefined
    ) {
      if (currentAddress) {
        updates.address = {
          ...currentAddress,
          ...(input.address !== undefined
            ? { line1: input.address.trim() }
            : {}),
          ...(input.city !== undefined ? { city: input.city.trim() } : {}),
          ...(input.district !== undefined
            ? { district: input.district.trim() }
            : {}),
        };
      } else if (input.address !== undefined) {
        updates.address = input.address.trim();
      }
    }
    if (input.city !== undefined) updates.city = input.city.trim();
    if (input.district !== undefined) updates.district = input.district.trim();
    if (input.businessName !== undefined)
      updates['lenderProfile.businessName'] = input.businessName.trim();
    if (input.responseTimeHours !== undefined)
      updates.responseTimeHours = input.responseTimeHours;
    if (input.preferredRegions !== undefined)
      updates.preferredRegions = this.uniqueRegions(input.preferredRegions);

    const current = this.mapProfile(lenderId, data);
    updates.searchKeywords = this.buildSearchKeywords([
      input.fullName ?? current.fullName,
      input.businessName ?? current.businessName ?? '',
      input.city ?? current.city ?? '',
      input.district ?? current.district ?? '',
    ]);

    await docRef.update(updates);
    const updatedSnapshot = await docRef.get();

    return this.mapProfile(
      lenderId,
      updatedSnapshot.data() ?? { ...data, ...updates },
    );
  }

  private validateInput(input: UpdateLenderProfileInput): void {
    if (input.fullName !== undefined && input.fullName.trim().length < 3) {
      throw new BadRequestException('fullName must be at least 3 characters.');
    }

    if (input.email !== undefined && !input.email.includes('@')) {
      throw new BadRequestException('email must be valid.');
    }

    if (
      input.businessName !== undefined &&
      input.businessName.trim().length > 0 &&
      input.businessName.trim().length < 3
    ) {
      throw new BadRequestException(
        'businessName must be at least 3 characters.',
      );
    }

    if (
      input.city !== undefined &&
      input.city.trim().length > 0 &&
      input.city.trim().length < 2
    ) {
      throw new BadRequestException('city must be at least 2 characters.');
    }
    if (
      input.district !== undefined &&
      input.district.trim().length > 0 &&
      input.district.trim().length < 2
    ) {
      throw new BadRequestException('district must be at least 2 characters.');
    }

    if (
      input.responseTimeHours !== undefined &&
      (input.responseTimeHours <= 0 || input.responseTimeHours > 72)
    ) {
      throw new BadRequestException(
        'responseTimeHours must be between 1 and 72.',
      );
    }
  }

  private mapProfile(
    lenderId: string,
    data: Record<string, unknown>,
  ): LenderProfileResponse {
    const lenderProfile =
      data.lenderProfile && typeof data.lenderProfile === 'object'
        ? (data.lenderProfile as Record<string, unknown>)
        : {};

    return {
      lenderId,
      fullName:
        typeof data.fullName === 'string' && data.fullName.trim().length > 0
          ? data.fullName
          : 'Unnamed lender',
      email: typeof data.email === 'string' ? data.email : 'No email',
      phone: typeof data.phone === 'string' ? data.phone : null,
      address: this.formatAddress(data.address),
      city:
        this.readAddress(data)?.city ??
        (typeof data.city === 'string' ? data.city : null),
      district:
        this.readAddress(data)?.district ??
        (typeof data.district === 'string' ? data.district : null),
      businessName:
        typeof lenderProfile.businessName === 'string'
          ? lenderProfile.businessName
          : typeof data.businessName === 'string'
            ? data.businessName
            : null,
      businessRegistrationNo:
        typeof lenderProfile.registrationNumber === 'string'
          ? lenderProfile.registrationNumber
          : typeof data.businessRegistrationNo === 'string'
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
        typeof lenderProfile.rating === 'number' &&
        Number.isFinite(lenderProfile.rating)
          ? lenderProfile.rating
          : typeof data.rating === 'number' && Number.isFinite(data.rating)
            ? data.rating
            : null,
      profilePhotoUrl:
        typeof data.profilePhotoUrl === 'string' ? data.profilePhotoUrl : null,
      updatedAt: this.toIsoString(data.updatedAt),
    };
  }

  private readAddress(data: Record<string, unknown>): {
    line1: string;
    line2?: string;
    city: string;
    district: string;
    province: string;
  } | null {
    if (!data.address || typeof data.address !== 'object') {
      return null;
    }

    const address = data.address as Record<string, unknown>;
    if (
      typeof address.line1 !== 'string' ||
      typeof address.city !== 'string' ||
      typeof address.district !== 'string' ||
      typeof address.province !== 'string'
    ) {
      return null;
    }

    return {
      line1: address.line1,
      ...(typeof address.line2 === 'string' && address.line2.trim()
        ? { line2: address.line2 }
        : {}),
      city: address.city,
      district: address.district,
      province: address.province,
    };
  }

  private formatAddress(value: unknown): string | null {
    if (typeof value === 'string') {
      return value;
    }

    const address = this.readAddress({ address: value });
    return address
      ? [
          address.line1,
          address.line2,
          address.city,
          address.district,
          address.province,
        ]
          .filter(Boolean)
          .join(', ')
      : null;
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
