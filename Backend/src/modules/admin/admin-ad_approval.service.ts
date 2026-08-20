import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../../firebase/firebase.service';
import { rethrowFirebaseError } from '../../common/firebase-error';

type AdminAdStatus = 'pending' | 'approved' | 'active' | 'rejected' | 'closed';

@Injectable()
export class AdminAdApprovalService {
  private static readonly DEFAULT_PAGE_SIZE = 10;
  private static readonly MAX_PAGE_SIZE = 100;
  private readonly collection = 'loanListings';

  constructor(private readonly firebaseService: FirebaseService) {}

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
        return 'active';
      case 'approved':
        return 'approved';
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

  async getAds(limit?: string, cursor?: string) {
    try {
      const pageSize = this.parseLimit(limit);
      let query: FirebaseFirestore.Query = this.db
        .collection(this.collection)
        .orderBy('createdAt', 'desc');

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
      const snapshot = await this.db.collection(this.collection).get();
      const stats = {
        all: snapshot.size,
        active: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        closed: 0,
      };

      snapshot.docs.forEach((doc) => {
        stats[this.normalizeStatus(doc.data().status)] += 1;
      });
      return { success: true, stats };
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
}
