import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import {
  distanceBetween,
  geohashForLocation,
  geohashQueryBounds,
} from 'geofire-common';

import type { AuthenticatedUser } from '../../common/types/authenticated-request';
import { FirebaseService } from '../../firebase/firebase.service';
import type { UserRole } from '../auth/auth.types';
import {
  LOCATION_VISIBILITIES,
  LocationVisibility,
  NearbyQuery,
  UpdateLocationDto,
} from './dto/location.dto';

type UserLocationDocument = {
  userId: string;
  role: UserRole;
  latitude: number;
  longitude: number;
  geohash: string;
  city?: string;
  district?: string;
  visibility: LocationVisibility;
  updatedAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
};

type NearbyLocation = {
  userId: string;
  role: UserRole;
  latitude: number;
  longitude: number;
  city?: string;
  district?: string;
  visibility: LocationVisibility;
  distanceKm: number;
};

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly LOCATIONS_COL = 'userLocations';
  private readonly LENDER_BORROWERS_COL = 'lenderBorrowers';
  private readonly LOAN_REQUESTS_COL = 'loanRequests';
  private readonly DEFAULT_RADIUS_KM = 10;
  private readonly MAX_RADIUS_KM = 30;
  private readonly DEFAULT_LIMIT = 50;
  private readonly MAX_LIMIT = 100;

  constructor(private readonly firebaseService: FirebaseService) {}

  private get db() {
    return this.firebaseService.db;
  }

  async updateMyLocation(user: AuthenticatedUser, dto: UpdateLocationDto) {
    const latitude = this.readCoordinate(dto.latitude, 'latitude', -90, 90);
    const longitude = this.readCoordinate(dto.longitude, 'longitude', -180, 180);
    const visibility = this.resolveVisibility(user.role, dto.visibility);
    const geohash = geohashForLocation([latitude, longitude]);

    const location: UserLocationDocument = {
      userId: user.sub,
      role: user.role,
      latitude,
      longitude,
      geohash,
      city: this.cleanText(dto.city),
      district: this.cleanText(dto.district),
      visibility,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await this.db
      .collection(this.LOCATIONS_COL)
      .doc(user.sub)
      .set(this.removeUndefined(location), {
        merge: true,
      });

    return {
      ...location,
      updatedAt: new Date().toISOString(),
    };
  }

  async getNearbyLenders(user: AuthenticatedUser, query: NearbyQuery) {
    if (user.role !== 'borrower') {
      throw new ForbiddenException('Only borrowers can search nearby lenders.');
    }

    const lenders = await this.findNearbyByRole('lender', query);

    if (lenders.length === 0) {
      this.logger.warn(
        'No nearby lender locations found. Lenders must save location before borrower map markers can appear.',
      );
    }

    return lenders;
  }

  async getNearbyBorrowers(user: AuthenticatedUser, query: NearbyQuery) {
    if (user.role !== 'lender') {
      throw new ForbiddenException('Only lenders can search nearby borrowers.');
    }

    const allowedBorrowerIds = await this.getBorrowerIdsForLender(user.sub);
    if (allowedBorrowerIds.size === 0) {
      return [];
    }

    const locations = await this.findNearbyByRole('borrower', query);
    return locations.filter((location) => allowedBorrowerIds.has(location.userId));
  }

  private async findNearbyByRole(
    role: UserRole,
    query: NearbyQuery,
  ): Promise<NearbyLocation[]> {
    const center = this.readCenter(query);
    const radiusKm = this.readPositiveNumber(
      query.radiusKm,
      this.DEFAULT_RADIUS_KM,
      this.MAX_RADIUS_KM,
      'radiusKm',
    );
    const limit = Math.round(
      this.readPositiveNumber(
        query.limit,
        this.DEFAULT_LIMIT,
        this.MAX_LIMIT,
        'limit',
      ),
    );
    const radiusMeters = radiusKm * 1000;
    const bounds = geohashQueryBounds(center, radiusMeters);

    const snapshots = await this.getLocationSnapshotsByBounds(role, bounds);

    const seen = new Set<string>();
    const results: NearbyLocation[] = [];

    snapshots.forEach((snapshot) => {
      snapshot.docs.forEach((doc) => {
        if (seen.has(doc.id)) {
          return;
        }

        seen.add(doc.id);
        const location = this.toNearbyLocation(doc.data(), center, radiusKm);
        if (location) {
          results.push(location);
        }
      });
    });

    return results
      .sort((left, right) => left.distanceKm - right.distanceKm)
      .slice(0, limit);
  }

  private async getLocationSnapshotsByBounds(
    role: UserRole,
    bounds: Array<[string, string]>,
  ): Promise<FirebaseFirestore.QuerySnapshot[]> {
    try {
      return await Promise.all(
        bounds.map(([start, end]) =>
          this.db
            .collection(this.LOCATIONS_COL)
            .where('role', '==', role)
            .orderBy('geohash')
            .startAt(start)
            .endAt(end)
            .get(),
        ),
      );
    } catch (error) {
      if (!this.isIndexBuildingError(error)) {
        throw error;
      }

      this.logger.warn(
        'userLocations geohash index is still building; using role-only fallback query.',
      );

      const snapshot = await this.db
        .collection(this.LOCATIONS_COL)
        .where('role', '==', role)
        .get();

      return [snapshot];
    }
  }

  private async getBorrowerIdsForLender(lenderId: string): Promise<Set<string>> {
    const [relationSnapshot, requestSnapshot, matchedRequestSnapshot] =
      await Promise.all([
        this.db
          .collection(this.LENDER_BORROWERS_COL)
          .where('lenderId', '==', lenderId)
          .get(),
        this.db
          .collection(this.LOAN_REQUESTS_COL)
          .where('targetLenderId', '==', lenderId)
          .get(),
        this.db
          .collection(this.LOAN_REQUESTS_COL)
          .where('matchedLenderIds', 'array-contains', lenderId)
          .get(),
      ]);

    const borrowerIds = new Set<string>();
    [relationSnapshot, requestSnapshot, matchedRequestSnapshot].forEach(
      (snapshot) => {
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const borrowerId =
            this.cleanText(data.borrowerId) ?? this.cleanText(data.userId);
          if (borrowerId) {
            borrowerIds.add(borrowerId);
          }
        });
      },
    );

    return borrowerIds;
  }

  private toNearbyLocation(
    data: FirebaseFirestore.DocumentData,
    center: [number, number],
    radiusKm: number,
  ): NearbyLocation | null {
    const latitude = this.readOptionalNumber(data.latitude);
    const longitude = this.readOptionalNumber(data.longitude);
    const userId = this.cleanText(data.userId);
    const role = this.cleanText(data.role) as UserRole | undefined;
    const visibility = this.cleanText(data.visibility) as
      | LocationVisibility
      | undefined;

    if (
      latitude == null ||
      longitude == null ||
      !userId ||
      !role ||
      !visibility ||
      visibility === 'hidden'
    ) {
      return null;
    }

    const distanceKm = distanceBetween(center, [latitude, longitude]);
    if (distanceKm > radiusKm) {
      return null;
    }

    const displayCoordinates =
      visibility === 'approximate'
        ? this.toApproximateCoordinates(latitude, longitude)
        : { latitude, longitude };

    return {
      userId,
      role,
      latitude: displayCoordinates.latitude,
      longitude: displayCoordinates.longitude,
      city: this.cleanText(data.city),
      district: this.cleanText(data.district),
      visibility,
      distanceKm: Math.round(distanceKm * 100) / 100,
    };
  }

  private readCenter(query: NearbyQuery): [number, number] {
    return [
      this.readCoordinate(query.lat, 'lat', -90, 90),
      this.readCoordinate(query.lng, 'lng', -180, 180),
    ];
  }

  private readCoordinate(
    value: unknown,
    label: string,
    min: number,
    max: number,
  ): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < min || numeric > max) {
      throw new BadRequestException(`${label} must be between ${min} and ${max}.`);
    }

    return numeric;
  }

  private readPositiveNumber(
    value: unknown,
    fallback: number,
    max: number,
    label: string,
  ): number {
    if (value == null || value === '') {
      return fallback;
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      throw new BadRequestException(`${label} must be greater than 0.`);
    }

    return Math.min(numeric, max);
  }

  private readOptionalNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private resolveVisibility(
    role: UserRole,
    requested?: LocationVisibility,
  ): LocationVisibility {
    if (requested && !LOCATION_VISIBILITIES.includes(requested)) {
      throw new BadRequestException('Invalid location visibility.');
    }

    if (requested) {
      return requested;
    }

    return role === 'borrower' ? 'approximate' : 'exact';
  }

  private cleanText(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : undefined;
  }

  private removeUndefined<T extends Record<string, unknown>>(value: T): T {
    return Object.fromEntries(
      Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
    ) as T;
  }

  private isIndexBuildingError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const maybeError = error as { code?: unknown; details?: unknown };

    return (
      maybeError.code === 9 &&
      typeof maybeError.details === 'string' &&
      maybeError.details.toLowerCase().includes('index')
    );
  }

  private toApproximateCoordinates(latitude: number, longitude: number) {
    return {
      latitude: Math.round(latitude * 100) / 100,
      longitude: Math.round(longitude * 100) / 100,
    };
  }
}
