import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { AuditLogEntry } from './interfaces/audit-log.interface';
import { FirestoreTimestampLike } from './interfaces/user.interface';
import { rethrowFirebaseError } from '../../common/firebase-error';

@Injectable()
export class AdminAuditService {
  constructor(private readonly firebaseService: FirebaseService) {}

  private getPrimaryRole(role: unknown) {
    if (Array.isArray(role)) {
      return role[0];
    }

    return role;
  }

  // Normalizes Firestore timestamps and Date objects for the audit table.
  private formatDate(value?: FirestoreTimestampLike | Date) {
    if (!value) {
      return 'N/A';
    }

    const date = value instanceof Date ? value : value.toDate?.();

    if (!date) {
      return 'N/A';
    }

    return date.toISOString().replace('T', ' ').slice(0, 19);
  }

  // Builds a flat activity feed from admin-relevant Firestore collections.
  async getAuditLogs() {
    try {
      const db = this.firebaseService.db;

      const [usersSnapshot, adsSnapshot, disputesSnapshot, requestsSnapshot] =
        await Promise.all([
          db.collection('users').get(),
          db.collection('ads').get(),
          db.collection('disputes').get(),
          db.collection('loanRequests').get(),
        ]);

      const logs: AuditLogEntry[] = [];

      usersSnapshot.forEach((doc) => {
        const user = doc.data();

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

        if (user.status === 'active' && user.updatedAt) {
          logs.push({
            id: `USR-A-${doc.id}`,
            actionType: 'user_activated',
            description: `${this.getPrimaryRole(user.role) || 'User'} account is active`,
            performedBy: 'Admin',
            targetName: user.email || doc.id,
            targetType: 'user',
            dateTime: this.formatDate(user.updatedAt),
            severity: 'success',
          });
        }
      });

      usersSnapshot.forEach((doc) => {
        const user = doc.data();

        if (user.kycStatus === 'approved') {
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

        if (user.kycStatus === 'rejected') {
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
        const ad = doc.data();

        if (ad.status === 'approved' || ad.status === 'active') {
          logs.push({
            id: `AD-A-${doc.id}`,
            actionType: 'ad_approved',
            description: ad.notes || 'Lender advertisement approved',
            performedBy: 'Admin',
            targetName: ad.lenderName || doc.id,
            targetType: 'ad',
            dateTime: this.formatDate(
              ad.approvedAt || ad.reviewedAt || ad.updatedAt,
            ),
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

      disputesSnapshot.forEach((doc) => {
        const dispute = doc.data();

        if (dispute.status === 'resolved') {
          logs.push({
            id: `DSP-${doc.id}`,
            actionType: 'report_generated',
            description: dispute.resolution || 'Dispute resolved by admin',
            performedBy: 'Admin',
            targetName: doc.id,
            targetType: 'report',
            dateTime: this.formatDate(dispute.resolvedAt || dispute.updatedAt),
            severity: 'info',
          });
        }
      });

      requestsSnapshot.docs.slice(0, 25).forEach((doc) => {
        const request = doc.data();

        logs.push({
          id: `REQ-${doc.id}`,
          actionType: 'system_event',
          description: `Loan request ${request.status || 'submitted'} for ${request.amount || 0}`,
          performedBy: request.borrowerName || 'Borrower',
          targetName: request.requestId || doc.id,
          targetType: 'report',
          dateTime: this.formatDate(request.createdAt),
          severity: request.status === 'accepted' ? 'success' : 'info',
        });
      });

      logs.sort((a, b) => b.dateTime.localeCompare(a.dateTime));

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
