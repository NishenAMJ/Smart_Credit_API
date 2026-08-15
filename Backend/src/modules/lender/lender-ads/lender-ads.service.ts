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
  private readonly logger = new Logger(LenderAdsService.name);

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
        : input.lenderName;
    const location =
      typeof lenderData?.city === 'string' && lenderData.city.trim().length > 0
        ? lenderData.city
        : '';
    const responseTimeHours =
      typeof lenderData?.responseTimeHours === 'number' &&
      Number.isFinite(lenderData.responseTimeHours)
        ? lenderData.responseTimeHours
        : 24;
    const document = {
      listingId: docRef.id,
      lenderId: input.lenderId,
      title,
      description: `${input.borrowerFocus.trim()}. ${input.supportNote.trim()}`,
      purposeCategories: preferredPurposes,
      minAmountMinor: Math.round(input.minAmount * 100),
      maxAmountMinor: Math.round(input.maxAmount * 100),
      minInterestRateAnnual: input.interestRate,
      maxInterestRateAnnual: input.interestRate,
      minTenureMonths: Math.min(6, input.tenureMonths),
      maxTenureMonths: input.tenureMonths,
      location,
      currency: 'LKR',
      repaymentFrequency: 'monthly',
      status: 'pending_review',
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
      adId: document.listingId,
      lenderId: document.lenderId,
      title: document.title,
      description: document.description,
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
  ): Promise<LenderAdsListResponse> {
    const safePageSize = Math.min(Math.max(pageSize, 1), 12);
    const collection = this.firebaseService.getDb().collection('loanListings');

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

      return this.buildAdsPage(
        lenderId,
        snapshot.docs,
        safePageSize,
        snapshot.docs.length > safePageSize,
      );
    } catch (error) {
      if (!this.isMissingIndexError(error)) {
        throw error;
      }

      this.logger.warn(
        'The lender ads composite index is unavailable. Using in-memory ordering until the Firestore index is ready.',
      );
      const snapshot = await collection.where('lenderId', '==', lenderId).get();
      const orderedDocs = snapshot.docs.slice().sort((left, right) => {
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

      return this.buildAdsPage(
        lenderId,
        pagedDocs,
        safePageSize,
        pagedDocs.length > safePageSize,
      );
    }
  }

  private buildAdsPage(
    lenderId: string,
    docs: QueryDocumentSnapshot<DocumentData>[],
    pageSize: number,
    hasMore: boolean,
  ): LenderAdsListResponse {
    const items = docs
      .slice(0, pageSize)
      .map((doc) => this.mapLenderAd(doc.id, lenderId, doc.data()));

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
      if (!Number.isFinite(input.minAmount) || input.minAmount <= 0) {
        throw new BadRequestException('minAmount must be greater than zero.');
      }
      update.minAmountMinor = Math.round(input.minAmount * 100);
    }
    if (input.maxAmount !== undefined) {
      if (!Number.isFinite(input.maxAmount) || input.maxAmount <= 0) {
        throw new BadRequestException('maxAmount must be greater than zero.');
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
      if (!Number.isInteger(input.tenureMonths) || input.tenureMonths <= 0) {
        throw new BadRequestException(
          'tenureMonths must be a positive integer.',
        );
      }
      update.maxTenureMonths = input.tenureMonths;
    }
    if (input.active !== undefined) {
      update.status = input.active ? 'active' : 'paused';
    }

    await ref.update(update);
    const updated = await ref.get();
    return this.mapLenderAd(updated.id, lenderId, updated.data() ?? {});
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
      responseTimeHours: 24,
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
