import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
} from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import {
  applyDateCursor,
  buildPageInfo,
  decodeCursor,
  orderByDateAndId,
  readDate,
  readNumber,
  readString,
  readStringArray,
} from '../../../firebase/firestore-query.utils';
import { getAdStatus } from '../../../firebase/firestore-seed.utils';
import { LenderNotificationWriterService } from '../lender-notifications/lender-notification-writer.service';
import {
  CreateLenderAdInput,
  LenderAdResponse,
  LenderAdsListResponse,
} from './lender-ads.types';
import { LenderAdAnalyticsService } from './lender-ad-analytics.service';
import { buildSearchTokens } from '../../../common/firestore/search-tokens';

@Injectable()
export class LenderAdsService {
  private readonly logger = new Logger(LenderAdsService.name);
  private hasWarnedAboutMissingIndex = false;

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly notificationWriter: LenderNotificationWriterService,
    private readonly analyticsService: LenderAdAnalyticsService,
  ) {}

  async createAd(
    lenderId: string,
    input: CreateLenderAdInput,
  ): Promise<LenderAdResponse> {
    this.validateCreateInput(input);

    if (!lenderId.trim()) {
      throw new BadRequestException('Authenticated lender ID is required.');
    }

    const db = this.firebaseService.getDb();
    const lenderSnapshot = await db.collection('users').doc(lenderId).get();

    if (!lenderSnapshot.exists) {
      throw new NotFoundException('The authenticated lender was not found.');
    }

    const lenderData = lenderSnapshot.data() ?? {};
    this.assertLenderCanSubmitAdvertisement(lenderData);
    const lenderProfile =
      lenderData.lenderProfile && typeof lenderData.lenderProfile === 'object'
        ? (lenderData.lenderProfile as Record<string, unknown>)
        : {};
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromDate(this.getExpiryDate(now.toDate(), 30));
    const docRef = db.collection('loanListings').doc();
    const title = input.headline.trim();
    const preferredPurposes = this.buildPreferredPurposes(input);
    const lenderName =
      readString(lenderProfile.businessName, lenderData.fullName) ??
      'Verified lender';
    const location = readString(lenderData.city, lenderData.district) ?? '';
    const responseTimeHours =
      input.responseTimeHours ??
      (typeof lenderData?.responseTimeHours === 'number' &&
      Number.isFinite(lenderData.responseTimeHours)
        ? lenderData.responseTimeHours
        : 24);
    const document = {
      listingId: docRef.id,
      lenderId,
      lenderName,
      title,
      description: input.supportNote.trim(),
      purposeCategories: preferredPurposes,
      minAmountMinor: Math.round(input.minAmount * 100),
      maxAmountMinor: Math.round(input.maxAmount * 100),
      minInterestRateAnnual: input.interestRate,
      maxInterestRateAnnual: input.interestRate,
      minTenureMonths: input.minTenureMonths ?? Math.min(6, input.tenureMonths),
      maxTenureMonths: input.tenureMonths,
      location,
      currency: 'LKR',
      repaymentFrequency: 'monthly',
      borrowerFocus: input.borrowerFocus.trim(),
      processingTime: input.processingTime.trim(),
      repaymentStyle: input.repaymentStyle.trim(),
      requirements: input.requirements.trim(),
      responseTimeHours,
      status: 'pending_review',
      adminStatus: 'pending',
      searchTokens: buildSearchTokens([docRef.id, title, lenderId, lenderName]),
      availableCapitalMinor: Math.round(input.maxAmount * 100),
      adminReview: {
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
      },
      publishedAt: null,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(document);
    try {
      await this.notificationWriter.create({
        id: `ad-published-${docRef.id}`,
        lenderId,
        category: 'ad',
        eventType: 'ad_published',
        title: 'Advertisement submitted',
        message: `${title} was submitted for admin review.`,
        severity: 'info',
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
    } catch (error) {
      // The listing is already committed. A notification failure must not make
      // the client retry and create a duplicate advertisement.
      this.logger.error(
        `Advertisement ${docRef.id} was created, but its notification could not be written.`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    return {
      id: docRef.id,
      adId: document.listingId,
      lenderId: document.lenderId,
      title: document.title,
      description: document.description,
      borrowerFocus: document.borrowerFocus,
      processingTime: document.processingTime,
      repaymentStyle: input.repaymentStyle.trim(),
      requirements: document.requirements,
      minAmount: document.minAmountMinor / 100,
      maxAmount: document.maxAmountMinor / 100,
      preferredInterestRate: document.minInterestRateAnnual,
      maxTenureMonths: document.maxTenureMonths,
      location: document.location,
      preferredPurposes: document.purposeCategories,
      status: document.status,
      isBoosted: false,
      availableCapital: document.availableCapitalMinor / 100,
      applicationCount: 0,
      fundedLoansCount: 0,
      responseTimeHours,
      lenderName,
      expiresAt: document.expiresAt.toDate().toISOString(),
      createdAt: document.createdAt.toDate().toISOString(),
      updatedAt: document.updatedAt.toDate().toISOString(),
      searchKeywords: this.buildSearchKeywords([title, ...preferredPurposes]),
      seedBatchId: '',
      source: 'loanListings',
    };
  }

  async getAdsForLender(
    lenderId: string,
    pageSize = 6,
    cursor?: string | null,
    status?: string | null,
  ): Promise<LenderAdsListResponse> {
    const safePageSize = Math.min(Math.max(pageSize, 1), 12);
    const collection = this.firebaseService.getDb().collection('loanListings');
    const normalizedStatuses = this.normalizeStatusFilter(status);
    const lenderQuery = collection.where('lenderId', '==', lenderId);
    const scopedQuery = normalizedStatuses
      ? normalizedStatuses.length === 1
        ? lenderQuery.where('status', '==', normalizedStatuses[0])
        : lenderQuery.where('status', 'in', normalizedStatuses)
      : lenderQuery;

    try {
      const snapshot = await applyDateCursor(
        orderByDateAndId(scopedQuery, 'createdAt'),
        cursor,
      )
        .limit(safePageSize + 1)
        .get();

      return await this.buildAdsPage(
        lenderId,
        snapshot.docs,
        safePageSize,
        snapshot.docs.length > safePageSize,
      );
    } catch (error) {
      if (!this.isMissingIndexError(error)) {
        throw error;
      }

      if (!this.hasWarnedAboutMissingIndex) {
        this.logger.warn(
          'The lender ads composite index is unavailable. Using in-memory ordering temporarily. Deploy firestore.indexes.json and wait until the index is READY.',
        );
        this.hasWarnedAboutMissingIndex = true;
      }
      const snapshot = await collection.where('lenderId', '==', lenderId).get();
      const orderedDocs = snapshot.docs
        .filter(
          (doc) =>
            !normalizedStatuses ||
            normalizedStatuses.includes(getAdStatus(doc.data())),
        )
        .sort((left, right) => {
          const leftTime = readDate(left.get('createdAt'))?.getTime() ?? 0;
          const rightTime = readDate(right.get('createdAt'))?.getTime() ?? 0;

          return rightTime - leftTime || right.id.localeCompare(left.id);
        });
      const decodedCursor = decodeCursor(cursor);
      const startIndex = decodedCursor
        ? orderedDocs.findIndex((doc) => {
            const dateTime = readDate(doc.get('createdAt'))?.getTime() ?? 0;
            const cursorTime = decodedCursor.date.getTime();
            return (
              dateTime < cursorTime ||
              (dateTime === cursorTime &&
                doc.id.localeCompare(decodedCursor.id) < 0)
            );
          })
        : 0;
      const safeStartIndex = startIndex < 0 ? orderedDocs.length : startIndex;
      const pagedDocs = orderedDocs.slice(
        safeStartIndex,
        safeStartIndex + safePageSize + 1,
      );

      return await this.buildAdsPage(
        lenderId,
        pagedDocs,
        safePageSize,
        pagedDocs.length > safePageSize,
      );
    }
  }

  private async buildAdsPage(
    lenderId: string,
    docs: QueryDocumentSnapshot<DocumentData>[],
    pageSize: number,
    hasMore: boolean,
  ): Promise<LenderAdsListResponse> {
    const mappedItems = docs
      .slice(0, pageSize)
      .map((doc) => this.mapLenderAd(doc.id, lenderId, doc.data()));
    const counts = await this.analyticsService.getCountsForAds(
      mappedItems.map((item) => item.adId),
    );
    const items = mappedItems.map((item) => ({
      ...item,
      applicationCount: counts.get(item.adId)?.applicationCount ?? 0,
      fundedLoansCount: counts.get(item.adId)?.fundedLoansCount ?? 0,
    }));

    return {
      lenderId,
      ads: items,
      pageInfo: buildPageInfo(
        items.map((item) => ({
          ...item,
          cursorDate: item.createdAt ? new Date(item.createdAt) : null,
          cursorId: item.id,
        })),
        pageSize,
        hasMore,
      ),
    };
  }

  private isMissingIndexError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const candidate = error as { code?: unknown; details?: unknown };
    return (
      candidate.code === 9 &&
      typeof candidate.details === 'string' &&
      candidate.details.toLowerCase().includes('requires an index')
    );
  }

  private normalizeStatusFilter(status?: string | null): string[] | null {
    if (!status) return null;

    if (status === 'inactive') {
      return ['draft', 'paused', 'rejected', 'expired', 'closed'];
    }

    const supportedStatuses = new Set([
      'draft',
      'pending_review',
      'active',
      'paused',
      'rejected',
      'expired',
      'closed',
    ]);
    if (!supportedStatuses.has(status)) {
      throw new BadRequestException('Unsupported advertisement status.');
    }

    return [status];
  }

  async updateAdFromMobile(
    lenderId: string,
    adId: string,
    input: {
      minAmount?: number;
      maxAmount?: number;
      interestRate?: number;
      tenureMonths?: number;
      active?: boolean;
    },
  ): Promise<LenderAdResponse> {
    const db = this.firebaseService.getDb();
    const ref = db.collection('loanListings').doc(adId);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      throw new NotFoundException(`Lender ad ${adId} was not found.`);
    }
    if (snapshot.get('lenderId') !== lenderId) {
      throw new ForbiddenException('You can only update your own lender ads.');
    }

    const update: Record<string, unknown> = { updatedAt: Timestamp.now() };
    if (input.minAmount !== undefined) {
      if (
        !Number.isFinite(input.minAmount) ||
        input.minAmount < 10_000 ||
        input.minAmount > 5_000_000
      ) {
        throw new BadRequestException(
          'minAmount must be between LKR 10,000 and LKR 5,000,000.',
        );
      }
      update.minAmountMinor = Math.round(input.minAmount * 100);
    }
    if (input.maxAmount !== undefined) {
      if (
        !Number.isFinite(input.maxAmount) ||
        input.maxAmount < 10_000 ||
        input.maxAmount > 5_000_000
      ) {
        throw new BadRequestException(
          'maxAmount must be between LKR 10,000 and LKR 5,000,000.',
        );
      }
      update.maxAmountMinor = Math.round(input.maxAmount * 100);
      update.availableCapitalMinor = Math.round(input.maxAmount * 100);
    }
    if (input.interestRate !== undefined) {
      if (!Number.isFinite(input.interestRate) || input.interestRate <= 0) {
        throw new BadRequestException(
          'interestRate must be greater than zero.',
        );
      }
      update.minInterestRateAnnual = input.interestRate;
      update.maxInterestRateAnnual = input.interestRate;
    }
    if (input.tenureMonths !== undefined) {
      if (
        !Number.isInteger(input.tenureMonths) ||
        input.tenureMonths < 3 ||
        input.tenureMonths > 60
      ) {
        throw new BadRequestException('tenureMonths must be between 3 and 60.');
      }
      update.maxTenureMonths = input.tenureMonths;
    }
    if (input.active !== undefined) {
      update.status = input.active ? 'active' : 'paused';
      update.adminStatus = input.active ? 'active' : 'closed';
    }

    await ref.update(update);
    const updated = await ref.get();
    return this.mapLenderAd(updated.id, lenderId, updated.data() ?? {});
  }

  async updateAd(
    lenderId: string,
    adId: string,
    input: Partial<CreateLenderAdInput> & { status?: string },
  ): Promise<LenderAdResponse> {
    const db = this.firebaseService.getDb();
    const ref = db.collection('loanListings').doc(adId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      throw new NotFoundException(`Lender ad ${adId} was not found.`);
    }
    if (snapshot.get('lenderId') !== lenderId) {
      throw new ForbiddenException('You can only update your own lender ads.');
    }

    const current = snapshot.data() ?? {};
    const update: Record<string, unknown> = { updatedAt: Timestamp.now() };
    const contentChanged = Object.keys(input).some(
      (key) =>
        key !== 'status' && input[key as keyof typeof input] !== undefined,
    );

    if (contentChanged) {
      const lenderSnapshot = await db.collection('users').doc(lenderId).get();
      if (!lenderSnapshot.exists) {
        throw new NotFoundException('The authenticated lender was not found.');
      }
      this.assertLenderCanSubmitAdvertisement(lenderSnapshot.data() ?? {});
    }

    if (input.headline !== undefined) update.title = input.headline.trim();
    if (input.supportNote !== undefined)
      update.description = input.supportNote.trim();
    if (input.borrowerFocus !== undefined)
      update.borrowerFocus = input.borrowerFocus.trim();
    if (input.processingTime !== undefined)
      update.processingTime = input.processingTime.trim();
    if (input.responseTimeHours !== undefined)
      update.responseTimeHours = input.responseTimeHours;
    if (input.repaymentStyle !== undefined)
      update.repaymentStyle = input.repaymentStyle.trim();
    if (input.requirements !== undefined)
      update.requirements = input.requirements.trim();
    if (input.minAmount !== undefined)
      update.minAmountMinor = Math.round(input.minAmount * 100);
    if (input.maxAmount !== undefined) {
      update.maxAmountMinor = Math.round(input.maxAmount * 100);
      update.availableCapitalMinor = Math.round(input.maxAmount * 100);
    }
    if (input.interestRate !== undefined) {
      update.minInterestRateAnnual = input.interestRate;
      update.maxInterestRateAnnual = input.interestRate;
    }
    if (input.tenureMonths !== undefined)
      update.maxTenureMonths = input.tenureMonths;
    if (input.minTenureMonths !== undefined)
      update.minTenureMonths = input.minTenureMonths;

    if (contentChanged) {
      const merged: CreateLenderAdInput = {
        headline: input.headline ?? readString(current.title) ?? '',
        minAmount: input.minAmount ?? readNumber(current.minAmountMinor) / 100,
        maxAmount: input.maxAmount ?? readNumber(current.maxAmountMinor) / 100,
        interestRate:
          input.interestRate ?? readNumber(current.minInterestRateAnnual),
        tenureMonths: input.tenureMonths ?? readNumber(current.maxTenureMonths),
        minTenureMonths:
          input.minTenureMonths ?? readNumber(current.minTenureMonths),
        borrowerFocus:
          input.borrowerFocus ??
          readString(current.borrowerFocus) ??
          (readStringArray(current.purposeCategories).join(', ') ||
            'Eligible borrowers'),
        processingTime:
          input.processingTime ??
          readString(current.processingTime) ??
          'Within 2 business days',
        responseTimeHours:
          input.responseTimeHours ??
          (typeof current.responseTimeHours === 'number'
            ? current.responseTimeHours
            : undefined),
        preferredPurposes:
          input.preferredPurposes ?? readStringArray(current.purposeCategories),
        repaymentStyle:
          input.repaymentStyle ??
          readString(current.repaymentStyle) ??
          'Monthly installments',
        requirements:
          input.requirements ??
          readString(current.requirements) ??
          'Approved KYC and supporting financial documents',
        supportNote: input.supportNote ?? readString(current.description) ?? '',
      };
      this.validateCreateInput(merged);
      update.purposeCategories = this.buildPreferredPurposes(merged);
      update.status = 'pending_review';
      update.adminStatus = 'pending';
      update.searchTokens = buildSearchTokens([
        adId,
        merged.headline,
        lenderId,
        current.lenderName,
      ]);
      update.adminReview = {
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
      };
      update.publishedAt = null;
    } else if (input.status !== undefined) {
      const currentStatus = getAdStatus(current);
      if (input.status === 'paused' && currentStatus === 'active') {
        update.status = 'paused';
        update.adminStatus = 'closed';
      } else if (input.status === 'active' && currentStatus === 'paused') {
        this.validateCreateInput({
          headline: readString(current.title) ?? '',
          minAmount: readNumber(current.minAmountMinor) / 100,
          maxAmount: readNumber(current.maxAmountMinor) / 100,
          interestRate: readNumber(current.minInterestRateAnnual),
          minTenureMonths: readNumber(current.minTenureMonths),
          tenureMonths: readNumber(current.maxTenureMonths),
          borrowerFocus:
            readString(current.borrowerFocus) ??
            readStringArray(current.purposeCategories).join(', '),
          processingTime:
            readString(current.processingTime) ?? 'Within 2 business days',
          repaymentStyle:
            readString(current.repaymentStyle) ?? 'Monthly installments',
          requirements:
            readString(current.requirements) ??
            'Approved KYC and supporting financial documents',
          supportNote: readString(current.description) ?? '',
        });
        update.status = 'active';
        update.adminStatus = 'active';
      } else {
        throw new BadRequestException(
          'Only active advertisements can be paused and only paused advertisements can be resumed.',
        );
      }
    }

    await ref.update(update);
    const updated = await ref.get();
    return this.mapLenderAd(updated.id, lenderId, updated.data() ?? {});
  }

  private validateCreateInput(input: CreateLenderAdInput): void {
    if (input.headline.trim().length < 12) {
      throw new BadRequestException('headline must be at least 12 characters.');
    }

    if (
      !Number.isFinite(input.minAmount) ||
      !Number.isFinite(input.maxAmount) ||
      input.minAmount < 10_000 ||
      input.maxAmount < 10_000 ||
      input.minAmount > 5_000_000 ||
      input.maxAmount > 5_000_000
    ) {
      throw new BadRequestException(
        'Loan amounts must be between LKR 10,000 and LKR 5,000,000.',
      );
    }

    if (input.maxAmount < input.minAmount) {
      throw new BadRequestException(
        'maxAmount must be greater than or equal to minAmount.',
      );
    }

    if (
      !Number.isFinite(input.interestRate) ||
      input.interestRate <= 0 ||
      input.interestRate > 100
    ) {
      throw new BadRequestException(
        'interestRate must be greater than zero and no more than 100.',
      );
    }

    if (
      !Number.isInteger(input.tenureMonths) ||
      input.tenureMonths < 3 ||
      input.tenureMonths > 60
    ) {
      throw new BadRequestException(
        'tenureMonths must be a whole number between 3 and 60.',
      );
    }

    const minTenureMonths =
      input.minTenureMonths ?? Math.min(6, input.tenureMonths);
    if (
      !Number.isInteger(minTenureMonths) ||
      minTenureMonths < 3 ||
      minTenureMonths > input.tenureMonths
    ) {
      throw new BadRequestException(
        'minTenureMonths must be between 3 and the maximum tenure.',
      );
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

    if (
      input.responseTimeHours !== undefined &&
      (!Number.isInteger(input.responseTimeHours) ||
        input.responseTimeHours < 1 ||
        input.responseTimeHours > 168)
    ) {
      throw new BadRequestException(
        'responseTimeHours must be a whole number between 1 and 168.',
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

  private assertLenderCanSubmitAdvertisement(
    lender: Record<string, unknown>,
  ): void {
    if (lender.accountStatus !== 'active') {
      throw new ForbiddenException(
        'Your lender account must be active before submitting advertisements.',
      );
    }

    if (lender.kycStatus !== 'approved') {
      throw new ForbiddenException(
        'KYC approval is required before submitting advertisements. Complete KYC and wait for an administrator to approve it.',
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

  private buildPreferredPurposes(input: CreateLenderAdInput): string[] {
    const source =
      input.preferredPurposes && input.preferredPurposes.length > 0
        ? input.preferredPurposes
        : [input.borrowerFocus];
    const tokens = source
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

  private mapLenderAd(
    id: string,
    lenderId: string,
    data: Record<string, unknown>,
  ): LenderAdResponse {
    return {
      id,
      adId: typeof data.listingId === 'string' ? data.listingId : id,
      lenderId: typeof data.lenderId === 'string' ? data.lenderId : lenderId,
      title:
        typeof data.title === 'string' && data.title.trim().length > 0
          ? data.title
          : 'Untitled ad',
      description: typeof data.description === 'string' ? data.description : '',
      borrowerFocus:
        readString(data.borrowerFocus) ??
        readStringArray(data.purposeCategories)[0] ??
        'Eligible borrowers',
      processingTime:
        readString(data.processingTime) ?? 'Within 2 business days',
      repaymentStyle: readString(data.repaymentStyle) ?? 'Monthly installments',
      requirements:
        readString(data.requirements) ??
        'Approved KYC and supporting financial documents',
      minAmount: this.toNumber(data.minAmountMinor) / 100,
      maxAmount: this.toNumber(data.maxAmountMinor) / 100,
      preferredInterestRate: this.toNumber(data.minInterestRateAnnual),
      maxTenureMonths: this.toNumber(data.maxTenureMonths),
      location: typeof data.location === 'string' ? data.location : '',
      preferredPurposes: readStringArray(data.purposeCategories),
      status: getAdStatus(data),
      isBoosted: data.isBoosted === true,
      availableCapital: this.toNumber(data.availableCapitalMinor) / 100,
      applicationCount: 0,
      fundedLoansCount: 0,
      responseTimeHours: this.toNumber(data.responseTimeHours) || 24,
      lenderName: typeof data.lenderName === 'string' ? data.lenderName : null,
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
    };
  }
}
