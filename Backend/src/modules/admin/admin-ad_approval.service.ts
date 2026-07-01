import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { Advertisement } from '../advertisement/interfaces/advertisement.interface';

@Injectable()
export class AdminAdApprovalService {
  private db         = getFirestore();
  private collection = 'ads';

  // ── Get all ads by status (pending / active / rejected / all) ──
  async getAdsByStatus(status?: string): Promise<any[]> {
    let query: FirebaseFirestore.Query = this.db.collection(this.collection);

    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();

    if (snapshot.empty) return [];

    return snapshot.docs.map((doc) => {
      const data = doc.data() as Advertisement;
      return {
        adId:                  data.adId,
        lenderId:              data.lenderId,
        lenderName:            data.lenderName,
        title:                 data.title,
        description:           data.description,
        minAmount:             data.minAmount,
        maxAmount:             data.maxAmount,
        preferredInterestRate: data.preferredInterestRate,
        location:              data.location,
        preferredPurposes:     data.preferredPurposes,
        status:                data.status,
        rejectionReason:       (data as any).rejectionReason ?? null,
        createdAt:             data.createdAt.toDate().toISOString(),
        expiresAt:             data.expiresAt.toDate().toISOString(),
      };
    });
  }

  // ── Get single ad detail for review ───────────────────────────
  async getAdDetail(adId: string): Promise<any> {
    const doc = await this.db.collection(this.collection).doc(adId).get();

    if (!doc.exists) {
      throw new NotFoundException(`Ad ${adId} not found`);
    }

    const data = doc.data() as Advertisement;

    return {
      adId:                  data.adId,
      lenderId:              data.lenderId,
      lenderName:            data.lenderName,
      lenderPhotoURL:        data.lenderPhotoURL,
      lenderRating:          data.lenderRating,
      title:                 data.title,
      description:           data.description,
      minAmount:             data.minAmount,
      maxAmount:             data.maxAmount,
      preferredInterestRate: data.preferredInterestRate,
      minTenureMonths:       data.minTenureMonths,
      maxTenureMonths:       data.maxTenureMonths,
      preferredPurposes:     data.preferredPurposes,
      availableCapital:      data.availableCapital,
      responseTimeHours:     data.responseTimeHours,
      location:              data.location,
      searchKeywords:        data.searchKeywords,
      status:                data.status,
      rejectionReason:       (data as any).rejectionReason ?? null,
      createdAt:             data.createdAt.toDate().toISOString(),
      expiresAt:             data.expiresAt.toDate().toISOString(),
    };
  }

  // ── Approve a pending ad ──────────────────────────────────────
  async approveAd(adId: string, adminId: string): Promise<{ message: string }> {
    const docRef  = this.db.collection(this.collection).doc(adId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new NotFoundException(`Ad ${adId} not found`);
    }

    const data = docSnap.data() as Advertisement;

    if (data.status !== 'pending') {
      throw new BadRequestException(
        `Ad is already ${data.status}. Only pending ads can be approved.`,
      );
    }

    await docRef.update({
      status:           'active',
      approvedAt:       admin.firestore.Timestamp.now(),
      approvedBy:       adminId,
      rejectionReason:  admin.firestore.FieldValue.delete(), // clear any old rejection
      updatedAt:        admin.firestore.Timestamp.now(),
    });

    // ── Notify lender via Firestore notifications collection ─────
    await this.db.collection('notifications').add({
      userId:    data.lenderId,
      type:      'ad_approved',
      title:     'Ad Approved ✅',
      message:   `Your ad "${data.title}" has been approved and is now live.`,
      adId,
      read:      false,
      createdAt: admin.firestore.Timestamp.now(),
    });

    return { message: `Ad "${data.title}" approved and is now active` };
  }

  // ── Reject a pending ad ───────────────────────────────────────
  async rejectAd(
    adId: string,
    adminId: string,
    reason: string,
  ): Promise<{ message: string }> {
    if (!reason?.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }

    const docRef  = this.db.collection(this.collection).doc(adId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new NotFoundException(`Ad ${adId} not found`);
    }

    const data = docSnap.data() as Advertisement;

    if (data.status !== 'pending') {
      throw new BadRequestException(
        `Ad is already ${data.status}. Only pending ads can be rejected.`,
      );
    }

    await docRef.update({
      status:          'rejected',
      rejectionReason: reason.trim(),
      rejectedAt:      admin.firestore.Timestamp.now(),
      rejectedBy:      adminId,
      updatedAt:       admin.firestore.Timestamp.now(),
    });

    // ── Notify lender ─────────────────────────────────────────────
    await this.db.collection('notifications').add({
      userId:    data.lenderId,
      type:      'ad_rejected',
      title:     'Ad Rejected ❌',
      message:   `Your ad "${data.title}" was rejected. Reason: ${reason.trim()}`,
      adId,
      read:      false,
      createdAt: admin.firestore.Timestamp.now(),
    });

    return { message: `Ad "${data.title}" rejected` };
  }

  // ── Get pending ads count (for admin dashboard badge) ─────────
  async getPendingCount(): Promise<{ count: number }> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('status', '==', 'pending')
      .get();

    return { count: snapshot.size };
  }
}