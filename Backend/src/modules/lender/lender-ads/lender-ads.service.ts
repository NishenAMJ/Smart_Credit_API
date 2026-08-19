import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import {
  applyDateCursor,
  buildPageInfo,
  decodeCursor,
  orderByDateAndId,
  readDate,
  readNumber,
  readStringArray,
} from '../../../firebase/firestore-query.utils';
import { getAdStatus } from '../../../firebase/firestore-seed.utils';
import { LenderNotificationWriterService } from '../lender-notifications/lender-notification-writer.service';
import {
  CreateLenderAdInput,
  LenderAdResponse,
  LenderAdsListResponse,
} from './lender-ads.types';

@Injectable()
export class LenderAdsService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly notificationWriter: LenderNotificationWriterService,
  ) {}

  async createAd(input: CreateLenderAdInput): Promise<LenderAdResponse> {
    this.validateCreateInput(input);

    const db = this.firebaseService.getDb();
    const lenderSnapshot = await db
      .collection('users')
      .doc(input.lenderId)
      .get();
    const lenderData = lenderSnapshot.data();
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromDate(this.getExpiryDate(now.toDate(), 30));
    const docRef = db.collection('loanListings').doc();
    const title = input.headline.trim();
    const preferredPurposes = this.buildPreferredPurposes(input);
    const lenderName =
      typeof lenderData?.businessName === 'string' &&
      lenderData.businessName.trim().length > 0
        ? lenderData.businessName
        : typeof lenderData?.fullName === 'string' &&
            lenderData.fullName.trim().length > 0
          ? lenderData.fullName
          : null;
    const location =
      typeof lenderData?.city === 'string' && lenderData.city.trim().length > 0
        ? lenderData.city
        : '';
    const responseTimeHours =
      typeof lenderData?.responseTimeHours === 'number' &&
      Number.isFinite(lenderData.responseTimeHours)
        ? lenderData.responseTimeHours
        : 24;
    const description =
      input.description && input.description.trim().length > 0
        ? input.description.trim()
        : `${input.borrowerFocus.trim()}. ${input.supportNote.trim()}`;
    const document = {
      adId: docRef.id,
      lenderId: input.lenderId,
      headline: title,
      title,
      description,
      borrowerFocus: input.borrowerFocus,
      processingTime: input.processingTime,
      repaymentStyle: input.repaymentStyle,
      requirements: input.requirements,
      supportNote: input.supportNote,
      minAmount: input.minAmount,
      maxAmount: input.maxAmount,
      preferredInterestRate: input.interestRate,
      minTenureMonths: Math.min(6, input.tenureMonths),
      maxTenureMonths: input.tenureMonths,
      location: input.location?.trim() || location,
      preferredPurposes,
      status: 'pending',
      isBoosted: false,
      availableCapital: input.maxAmount,
      applicationCount: 0,
      fundedLoansCount: 0,
      responseTimeHours,
      lenderName,
      lenderPhotoURL: null,
      lenderRating: null,
      imageUrl: '',
      expiresAt,
      createdAt: now,
      updatedAt: now,
      searchKeywords: this.buildSearchKeywords([
        lenderName ?? '',
        input.location?.trim() || location,
        title,
        preferredPurposes.join(' '),
        input.borrowerFocus,
        input.repaymentStyle,
      ]),
      seedBatchId: `manual_${input.lenderId}_${now.toDate().getTime()}`,
      source: 'create_ad_page',
    };

    await docRef.set(document);
    await this.notificationWriter.create({
      id: `ad-published-${docRef.id}`,
      lenderId: input.lenderId,
      category: 'ad',
      eventType: 'ad_published',
      title: 'Lender ad published',
      message: `${title} is now available in your lender workspace.`,
      severity: 'success',
      createdAt: now.toDate(),
      relatedEntityType: 'ad',
      relatedEntityId: docRef.id,
      actionLabel: 'Open ad page',
      actionTarget: 'create-ad',
      metadata: {
        adId: docRef.id,
        amount: input.maxAmount,
        status: document.status,
      },
    });

    return {
      id: docRef.id,
      adId: document.adId,
      lenderId: document.lenderId,
      title: document.title,
      description: document.description,
      minAmount: document.minAmount,
      maxAmount: document.maxAmount,
      preferredInterestRate: document.preferredInterestRate,
      maxTenureMonths: document.maxTenureMonths,
      location: document.location,
      preferredPurposes: document.preferredPurposes,
      status: document.status,
      isBoosted: document.isBoosted,
      availableCapital: document.availableCapital,
      applicationCount: document.applicationCount,
      fundedLoansCount: document.fundedLoansCount,
      responseTimeHours: document.responseTimeHours,
      lenderName,
      expiresAt: document.expiresAt.toDate().toISOString(),
      createdAt: document.createdAt.toDate().toISOString(),
      updatedAt: document.updatedAt.toDate().toISOString(),
      searchKeywords: document.searchKeywords,
      seedBatchId: document.seedBatchId,
      source: document.source,
    };
  }

  async getAdsForLender(
    lenderId: string,
    pageSize = 6,
    cursor?: string | null,
  ): Promise<LenderAdsListResponse> {
    const safePageSize = Math.min(Math.max(pageSize, 1), 12);
    const collection = this.firebaseService.getDb().collection('loanListings');
    let items: LenderAdResponse[];
    let hasMore: boolean;

    try {
      const snapshot = await applyDateCursor(
        orderByDateAndId(
          collection.where('lenderId', '==', lenderId),
          'createdAt',
        ),
        cursor,
      )
        .limit(safePageSize + 1)
        .get();

      items = snapshot.docs
        .slice(0, safePageSize)
        .map((doc) => this.mapLenderAd(doc.id, lenderId, doc.data()));
      hasMore = snapshot.docs.length > safePageSize;
    } catch {
      const snapshot = await collection.where('lenderId', '==', lenderId).get();
      const decodedCursor = decodeCursor(cursor);
      const allItems = snapshot.docs
        .map((doc) => this.mapLenderAd(doc.id, lenderId, doc.data()))
        .sort((left, right) => this.compareAdsByCreatedAt(left, right))
        .filter((item) => this.isAfterCursor(item, decodedCursor));

      items = allItems.slice(0, safePageSize);
      hasMore = allItems.length > safePageSize;
    }

    return {
      lenderId,
      ads: items,
      pageInfo: buildPageInfo(
        items.map((item) => ({
          ...item,
          cursorDate: item.createdAt ? new Date(item.createdAt) : null,
          cursorId: item.id,
        })),
        safePageSize,
        hasMore,
      ),
    };
  }

  async updateAdFromMobile(
    lenderId: string,
    adId: string,
    input: Record<string, unknown>,
  ): Promise<LenderAdResponse> {
    const db = this.firebaseService.getDb();
    const ref = db.collection('loanListings').doc(adId);
    const snapshot = await ref.get();
    const data = snapshot.data();

    if (!snapshot.exists || data?.lenderId !== lenderId) {
      throw new NotFoundException(`Ad ${adId} was not found.`);
    }

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };

    this.assignNumberUpdate(updateData, input, 'minAmount', 'minAmount');
    this.assignNumberUpdate(updateData, input, 'maxAmount', 'maxAmount');
    this.assignNumberUpdate(
      updateData,
      input,
      'interestRate',
      'preferredInterestRate',
    );
    this.assignNumberUpdate(
      updateData,
      input,
      'tenureMonths',
      'maxTenureMonths',
    );

    if (typeof input.active === 'boolean') {
      updateData.status = input.active ? 'active' : 'inactive';
    }

    if (typeof updateData.maxAmount === 'number') {
      updateData.availableCapital = updateData.maxAmount;
    }

    await ref.update(updateData);

    return this.mapLenderAd(adId, lenderId, {
      ...data,
      ...updateData,
    });
  }

  private validateCreateInput(input: CreateLenderAdInput): void {
    if (!input.lenderId.trim()) {
      throw new BadRequestException('lenderId is required.');
    }

    if (input.headline.trim().length < 12) {
      throw new BadRequestException('headline must be at least 12 characters.');
    }

    if (input.minAmount <= 0 || input.maxAmount <= 0) {
      throw new BadRequestException(
        'Loan amount range must be greater than zero.',
      );
    }

    if (input.maxAmount < input.minAmount) {
      throw new BadRequestException(
        'maxAmount must be greater than or equal to minAmount.',
      );
    }

    if (input.interestRate <= 0) {
      throw new BadRequestException('interestRate must be greater than zero.');
    }

    if (input.tenureMonths <= 0) {
      throw new BadRequestException('tenureMonths must be greater than zero.');
    }

    if (input.borrowerFocus.trim().length < 8) {
      throw new BadRequestException(
        'borrowerFocus must be at least 8 characters.',
      );
    }

    if (input.processingTime.trim().length < 6) {
      throw new BadRequestException(
        'processingTime must be at least 6 characters.',
      );
    }

    if (input.repaymentStyle.trim().length < 6) {
      throw new BadRequestException(
        'repaymentStyle must be at least 6 characters.',
      );
    }

    if (input.requirements.trim().length < 12) {
      throw new BadRequestException(
        'requirements must be at least 12 characters.',
      );
    }

    if (input.supportNote.trim().length < 12) {
      throw new BadRequestException(
        'supportNote must be at least 12 characters.',
      );
    }
  }

  private getExpiryDate(start: Date, daysFromNow: number): Date {
    const expiry = new Date(start);
    expiry.setDate(expiry.getDate() + daysFromNow);
    return expiry;
  }

  private toIsoString(value: unknown): string | null {
    return readDate(value)?.toISOString() ?? null;
  }

  private toNumber(value: unknown): number {
    return readNumber(value);
  }

  private assignNumberUpdate(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
    sourceKey: string,
    targetKey: string,
  ): void {
    if (!(sourceKey in source)) {
      return;
    }

    const value = readNumber(source[sourceKey]);

    if (value > 0) {
      target[targetKey] = value;
    }
  }

  private buildPreferredPurposes(input: CreateLenderAdInput): string[] {
    const tokens = [input.borrowerFocus, input.repaymentStyle]
      .flatMap((value) => value.split(/[,/]/))
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    return Array.from(new Set(tokens)).slice(0, 4);
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

  private compareAdsByCreatedAt(
    left: LenderAdResponse,
    right: LenderAdResponse,
  ): number {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;

    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return right.id.localeCompare(left.id);
  }

  private isAfterCursor(
    item: LenderAdResponse,
    cursor: { date: Date; id: string } | null,
  ): boolean {
    if (!cursor) {
      return true;
    }

    const itemTime = item.createdAt ? new Date(item.createdAt).getTime() : 0;
    const cursorTime = cursor.date.getTime();

    if (itemTime !== cursorTime) {
      return itemTime < cursorTime;
    }

    return item.id.localeCompare(cursor.id) < 0;
  }

  private mapLenderAd(
    id: string,
    lenderId: string,
    data: Record<string, unknown>,
  ): LenderAdResponse {
    const title =
      typeof data.title === 'string' && data.title.trim().length > 0
        ? data.title
        : typeof data.headline === 'string' && data.headline.trim().length > 0
          ? data.headline
          : 'Untitled ad';
    const description =
      typeof data.description === 'string' && data.description.trim().length > 0
        ? data.description
        : typeof data.supportNote === 'string'
          ? data.supportNote
          : '';
    const location =
      typeof data.location === 'string' && data.location.trim().length > 0
        ? data.location
        : typeof data.city === 'string' && data.city.trim().length > 0
          ? data.city
          : '';
    const lenderName =
      typeof data.lenderName === 'string' && data.lenderName.trim().length > 0
        ? data.lenderName
        : typeof data.businessName === 'string' && data.businessName.trim().length > 0
          ? data.businessName
          : typeof data.fullName === 'string' && data.fullName.trim().length > 0
            ? data.fullName
            : null;

    return {
      id,
      adId: typeof data.adId === 'string' ? data.adId : id,
      lenderId: typeof data.lenderId === 'string' ? data.lenderId : lenderId,
      title,
      description,
      minAmount: this.toNumber(data.minAmount ?? data.amount),
      maxAmount: this.toNumber(data.maxAmount ?? data.amount),
      preferredInterestRate: this.toNumber(
        data.preferredInterestRate ?? data.interestRate,
      ),
      minTenureMonths: this.toNumber(data.minTenureMonths ?? data.tenureMonths),
      maxTenureMonths: this.toNumber(data.maxTenureMonths ?? data.tenureMonths),
      location,
      preferredPurposes: readStringArray(data.preferredPurposes ?? data.purposeTags),
      status: getAdStatus(data),
      isBoosted: data.isBoosted === true,
      availableCapital: this.toNumber(data.availableCapital ?? data.maxAmount),
      applicationCount: this.toNumber(data.applicationCount),
      fundedLoansCount: this.toNumber(data.fundedLoansCount),
      responseTimeHours: this.toNumber(data.responseTimeHours),
      lenderName,
      expiresAt: this.toIsoString(data.expiresAt),
      createdAt: this.toIsoString(data.createdAt),
      updatedAt: this.toIsoString(data.updatedAt),
      searchKeywords: Array.isArray(data.searchKeywords)
        ? data.searchKeywords.filter(
            (value): value is string => typeof value === 'string',
          )
        : [],
      seedBatchId: typeof data.seedBatchId === 'string' ? data.seedBatchId : '',
      source: typeof data.source === 'string' ? data.source : 'unknown',
      lenderPhotoURL:
        typeof data.lenderPhotoURL === 'string' ? data.lenderPhotoURL : null,
      lenderRating:
        typeof data.lenderRating === 'number' ? data.lenderRating : undefined,
      imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : '',
    };
  }
}
