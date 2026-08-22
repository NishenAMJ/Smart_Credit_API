import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../../firebase/firebase.service';
import { rethrowFirebaseError } from '../../common/firebase-error';
import { AdminQueryCacheService } from '../../common/cache/admin-query-cache.service';
import { writeAuditLog } from '../../common/audit/write-audit-log';
import { normalizeSearchToken } from '../../common/firestore/search-tokens';
import { ChatGateway } from '../chat/gateway/chat.gateway';

type AdminAdStatus = 'pending' | 'active' | 'rejected' | 'closed';

@Injectable()
export class AdminAdApprovalService {
  private static readonly DEFAULT_PAGE_SIZE = 10;
  private static readonly MAX_PAGE_SIZE = 100;
  private readonly collection = 'loanListings';

  constructor(
    private readonly firebaseService: FirebaseService,
    @Optional()
    private readonly cache: AdminQueryCacheService = new AdminQueryCacheService(),
    @Optional() private readonly gateway?: ChatGateway,
  ) {}

  private get db() {
    return this.firebaseService.db;
  }

  private parseLimit(limit?: string): number {
    const parsed = Number(limit ?? AdminAdApprovalService.DEFAULT_PAGE_SIZE);
    if (!Number.isFinite(parsed))
      return AdminAdApprovalService.DEFAULT_PAGE_SIZE;
    return Math.min(
      Math.max(Math.trunc(parsed), 1),
      AdminAdApprovalService.MAX_PAGE_SIZE,
    );
  }

  private normalizeStatus(status: unknown): AdminAdStatus {
    switch (status) {
      case 'pending_review':
      case 'draft':
        return 'pending';
      case 'active':
      case 'approved':
        return 'active';
      case 'rejected':
        return 'rejected';
      case 'paused':
      case 'expired':
      case 'closed':
      default:
        return 'closed';
    }
  }

  private mapAd(id: string, data: FirebaseFirestore.DocumentData) {
    const review =
      data.adminReview && typeof data.adminReview === 'object'
        ? data.adminReview
        : {};

    return {
      id,
      adId: data.listingId ?? data.adId ?? id,
      lenderId: data.lenderId,
      lenderName: data.lenderName,
      lenderPhotoURL: data.lenderPhotoURL,
      lenderRating: data.lenderRating,
      title: data.title,
      description: data.description,
      minAmount:
        typeof data.minAmountMinor === 'number'
          ? data.minAmountMinor / 100
          : data.minAmount,
      maxAmount:
        typeof data.maxAmountMinor === 'number'
          ? data.maxAmountMinor / 100
          : data.maxAmount,
      preferredInterestRate:
        data.minInterestRateAnnual ?? data.preferredInterestRate,
      minTenureMonths: data.minTenureMonths,
      maxTenureMonths: data.maxTenureMonths,
      preferredPurposes: data.purposeCategories ?? data.preferredPurposes ?? [],
      availableCapital:
        typeof data.availableCapitalMinor === 'number'
          ? data.availableCapitalMinor / 100
          : data.availableCapital,
      responseTimeHours: data.responseTimeHours,
      location: data.location,
      status: this.normalizeStatus(data.status),
      rejectionReason: review.rejectionReason ?? data.rejectionReason ?? null,
      reviewedAt: review.reviewedAt,
      approvedAt: data.publishedAt ?? data.approvedAt,
      rejectedAt: data.rejectedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      expiresAt: data.expiresAt,
    };
  }

  private rawStatuses(status?: AdminAdStatus): string[] | undefined {
    if (status === 'pending') return ['pending_review', 'pending', 'draft'];
    if (status === 'active') return ['active', 'approved'];
    if (status === 'closed') return ['paused', 'expired', 'closed'];
    return status ? [status] : undefined;
  }

  private async count(query: FirebaseFirestore.Query): Promise<number> {
    return (await query.count().get()).data().count;
  }

  async getAds(
    limit?: string,
    cursor?: string,
    status?: AdminAdStatus,
    searchValue?: string,
  ) {
    try {
      const pageSize = this.parseLimit(limit);
      let query: FirebaseFirestore.Query = this.db.collection(this.collection);
      const statuses = this.rawStatuses(status);
      if (statuses?.length === 1)
        query = query.where('status', '==', statuses[0]);
      else if (statuses?.length) query = query.where('status', 'in', statuses);
      const search = normalizeSearchToken(searchValue);
      if (search) query = query.where('searchTokens', 'array-contains', search);
      query = query.orderBy('createdAt', 'desc');

      if (cursor) {
        const cursorDoc = await this.db
          .collection(this.collection)
          .doc(cursor)
          .get();
        if (cursorDoc.exists) query = query.startAfter(cursorDoc);
      }

      const snapshot = await query.limit(pageSize + 1).get();
      const hasMore = snapshot.docs.length > pageSize;
      const pageDocs = snapshot.docs.slice(0, pageSize);

      return {
        success: true,
        count: pageDocs.length,
        ads: pageDocs.map((doc) => this.mapAd(doc.id, doc.data())),
        hasMore,
        nextCursor: hasMore ? pageDocs[pageDocs.length - 1]?.id : undefined,
      };
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to fetch lender ads');
    }
  }

  async getAdStats() {
    try {
      const cached = await this.cache.remember('admin:ads:stats', async () => {
        const ads = this.db.collection(this.collection);
        const [all, active, pending, rejected, closed] =
          await Promise.all([
            this.count(ads),
            this.count(ads.where('status', 'in', this.rawStatuses('active')!)),
            this.count(ads.where('status', 'in', this.rawStatuses('pending')!)),
            this.count(ads.where('status', '==', 'rejected')),
            this.count(ads.where('status', 'in', this.rawStatuses('closed')!)),
          ]);
        return { all, active, pending, rejected, closed };
      });
      return {
        success: true,
        stats: cached.value,
        generatedAt: cached.generatedAt,
        cacheAgeSeconds: cached.cacheAgeSeconds,
      };
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to fetch lender ad statistics');
    }
  }

  async getAdDetail(adId: string) {
    const doc = await this.db.collection(this.collection).doc(adId).get();
    if (!doc.exists) throw new NotFoundException(`Ad ${adId} not found`);
    return { success: true, ad: this.mapAd(doc.id, doc.data() ?? {}) };
  }

  async approveAd(adId: string, adminId: string) {
    const docRef = this.db.collection(this.collection).doc(adId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) throw new NotFoundException(`Ad ${adId} not found`);

    const data = docSnap.data() ?? {};
    if (!['pending_review', 'pending', 'draft'].includes(data.status)) {
      throw new BadRequestException(
        `Ad is already ${data.status}. Only pending ads can be approved.`,
      );
    }

    const now = Timestamp.now();
    await docRef.update({
      status: 'active',
      adminStatus: 'active',
      adminReview: {
        reviewedBy: adminId,
        reviewedAt: now,
        rejectionReason: null,
      },
      publishedAt: now,
      updatedAt: now,
    });
    await this.writeNotification(
      data,
      adId,
      'ad_approved',
      'Ad Approved',
      `Your ad "${data.title}" has been approved and is now live.`,
    );
    this.cache.invalidate('admin:ads:');
    await writeAuditLog(this.db, {
      actorUserId: adminId,
      action: 'ad.approved',
      entityType: 'ad',
      entityId: adId,
      before: { status: data.status },
      after: { status: 'active' },
    });
    this.emitChange(adId, 'approved');
    return { success: true, status: 'active' };
  }

  async rejectAd(adId: string, adminId: string, reason: string) {
    if (!reason?.trim())
      throw new BadRequestException('Rejection reason is required');

    const docRef = this.db.collection(this.collection).doc(adId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) throw new NotFoundException(`Ad ${adId} not found`);

    const data = docSnap.data() ?? {};
    if (!['pending_review', 'pending', 'draft'].includes(data.status)) {
      throw new BadRequestException(
        `Ad is already ${data.status}. Only pending ads can be rejected.`,
      );
    }

    const now = Timestamp.now();
    await docRef.update({
      status: 'rejected',
      adminStatus: 'rejected',
      adminReview: {
        reviewedBy: adminId,
        reviewedAt: now,
        rejectionReason: reason.trim(),
      },
      publishedAt: null,
      rejectedAt: now,
      updatedAt: now,
    });
    await this.writeNotification(
      data,
      adId,
      'ad_rejected',
      'Ad Rejected',
      `Your ad "${data.title}" was rejected. Reason: ${reason.trim()}`,
    );
    this.cache.invalidate('admin:ads:');
    await writeAuditLog(this.db, {
      actorUserId: adminId,
      action: 'ad.rejected',
      entityType: 'ad',
      entityId: adId,
      before: { status: data.status },
      after: { status: 'rejected' },
      metadata: { reason: reason.trim() },
    });
    this.emitChange(adId, 'rejected');
    return { success: true, status: 'rejected' };
  }

  private async writeNotification(
    data: FirebaseFirestore.DocumentData,
    adId: string,
    type: string,
    title: string,
    message: string,
  ) {
    await this.db.collection('notifications').add({
      userId: data.lenderId,
      type,
      title,
      message,
      adId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  private emitChange(entityId: string, changeType: string): void {
    this.gateway?.emitToRole('admin', 'admin:changed', {
      resource: 'ads',
      entityId,
      changeType,
      updatedAt: new Date().toISOString(),
    });
  }
}
