import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { AuditLogEntry } from './interfaces/audit-log.interface';
import { FirestoreTimestampLike } from './interfaces/user.interface';
import { rethrowFirebaseError } from '../../common/firebase-error';

type AuditTimestamp = FirestoreTimestampLike | Date;

type AuditUserRecord = {
  status?: string;
  role?: string | string[];
  email?: string;
  fullName?: string;
  kycStatus?: string;
  suspensionReason?: string;
  rejectionReason?: string;
  suspendedAt?: AuditTimestamp;
  activatedAt?: AuditTimestamp;
  reviewedAt?: AuditTimestamp;
  updatedAt?: AuditTimestamp;
};

type AuditAdRecord = {
  status?: string;
  lenderName?: string;
  notes?: string;
  rejectionReason?: string;
  approvedAt?: AuditTimestamp;
  rejectedAt?: AuditTimestamp;
  reviewedAt?: AuditTimestamp;
  updatedAt?: AuditTimestamp;
};

@Injectable()
export class AdminAuditService {
  constructor(private readonly firebaseService: FirebaseService) {}

  private getPrimaryRole(role?: string | string[]) {
    if (Array.isArray(role)) {
      return role[0];
    }

    return role;
  }

  // Normalizes Firestore timestamps and Date objects for the audit table.
  private formatDate(value?: AuditTimestamp) {
    if (!value) {
      return 'N/A';
    }

    const date = value instanceof Date ? value : value.toDate?.();

    if (!date) {
      return 'N/A';
    }

    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const partValue = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value || '00';

    return `${partValue('year')}-${partValue('month')}-${partValue('day')} ${partValue('hour')}:${partValue('minute')}:${partValue('second')}`;
  }

  private getSortTime(dateTime: string) {
    if (dateTime === 'N/A') {
      return 0;
    }

    return new Date(dateTime.replace(' ', 'T')).getTime() || 0;
  }

  // Builds a flat activity feed from admin-relevant Firestore collections.
  async getAuditLogs() {
    try {
      const db = this.firebaseService.db;

      const [usersSnapshot, adsSnapshot] = await Promise.all([
        db.collection('users').get(),
        db.collection('ads').get(),
      ]);

      const logs: AuditLogEntry[] = [];

      usersSnapshot.forEach((doc) => {
        const user = doc.data() as AuditUserRecord;

        if (user.status === 'suspended') {
          logs.push({
            id: `USR-S-${doc.id}`,
            actionType: 'user_suspended',
            description:
              user.suspensionReason || 'User account was suspended by admin',
            performedBy: 'Admin',
            targetName: user.email || doc.id,
            targetType: 'user',
            dateTime: this.formatDate(user.suspendedAt || user.updatedAt),
            severity: 'critical',
          });
        }

        if (user.status === 'active' && user.activatedAt) {
          logs.push({
            id: `USR-A-${doc.id}`,
            actionType: 'user_activated',
            description: `${this.getPrimaryRole(user.role) || 'User'} account is active`,
            performedBy: 'Admin',
            targetName: user.email || doc.id,
            targetType: 'user',
            dateTime: this.formatDate(user.activatedAt),
            severity: 'success',
          });
        }
      });

      usersSnapshot.forEach((doc) => {
        const user = doc.data() as AuditUserRecord;

        if (user.kycStatus === 'approved' && user.reviewedAt) {
          logs.push({
            id: `KYC-A-${doc.id}`,
            actionType: 'kyc_approved',
            description: 'User KYC approved',
            performedBy: 'Admin',
            targetName: user.fullName || user.email || doc.id,
            targetType: 'user',
            dateTime: this.formatDate(user.reviewedAt || user.updatedAt),
            severity: 'success',
          });
        }

        if (user.kycStatus === 'rejected' && user.reviewedAt) {
          logs.push({
            id: `KYC-R-${doc.id}`,
            actionType: 'kyc_rejected',
            description: user.rejectionReason || 'User KYC rejected',
            performedBy: 'Admin',
            targetName: user.fullName || user.email || doc.id,
            targetType: 'user',
            dateTime: this.formatDate(user.reviewedAt || user.updatedAt),
            severity: 'warning',
          });
        }
      });

      adsSnapshot.forEach((doc) => {
        const ad = doc.data() as AuditAdRecord;

        const approvalTime = ad.approvedAt || ad.reviewedAt || ad.updatedAt;

        if (
          (ad.status === 'approved' || ad.status === 'active') &&
          approvalTime
        ) {
          logs.push({
            id: `AD-A-${doc.id}`,
            actionType: 'ad_approved',
            description: ad.notes || 'Lender advertisement approved',
            performedBy: 'Admin',
            targetName: ad.lenderName || doc.id,
            targetType: 'ad',
            dateTime: this.formatDate(approvalTime),
            severity: 'success',
          });
        }

        if (ad.status === 'rejected') {
          logs.push({
            id: `AD-R-${doc.id}`,
            actionType: 'ad_rejected',
            description: ad.rejectionReason || 'Lender advertisement rejected',
            performedBy: 'Admin',
            targetName: ad.lenderName || doc.id,
            targetType: 'ad',
            dateTime: this.formatDate(
              ad.rejectedAt || ad.reviewedAt || ad.updatedAt,
            ),
            severity: 'warning',
          });
        }
      });

      logs.sort(
        (a, b) => this.getSortTime(b.dateTime) - this.getSortTime(a.dateTime),
      );

      return {
        success: true,
        count: logs.length,
        logs: logs.slice(0, 100),
      };
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      rethrowFirebaseError(error, 'Failed to fetch audit logs');
    }
  }
}
