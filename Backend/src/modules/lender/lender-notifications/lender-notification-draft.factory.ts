import { Injectable } from '@nestjs/common';
import type { LenderNotificationDraft as NotificationDraft } from './lender-notification-writer.service';
import type {
  AdRecord,
  BorrowerProfile,
  DisputeRecord,
  LenderProfile,
  LoanRecord,
  NotificationGenerationPreferences,
  RequestRecord,
  TransactionRecord,
} from './lender-notification-sync.models';

const REQUEST_STATUS_UPDATES = new Set([
  'under_review',
  'approved',
  'pending_kyc',
]);

type BuildNotificationDraftsInput = {
  lenderId: string;
  requests: RequestRecord[];
  transactions: TransactionRecord[];
  loans: LoanRecord[];
  disputes: DisputeRecord[];
  ads: AdRecord[];
  loanMap: Map<string, LoanRecord>;
  borrowerMap: Map<string, BorrowerProfile>;
  overdueMap: Map<string, Date>;
  lenderProfile: LenderProfile;
  preferences: NotificationGenerationPreferences;
};

@Injectable()
export class LenderNotificationDraftFactory {
  build(input: BuildNotificationDraftsInput): NotificationDraft[] {
    return [
      ...this.buildRequestNotifications(
        input.lenderId,
        input.requests,
        input.borrowerMap,
        input.preferences,
      ),
      ...this.buildTransactionNotifications(
        input.lenderId,
        input.transactions,
        input.loanMap,
        input.borrowerMap,
        input.preferences,
      ),
      ...this.buildRiskNotifications(
        input.lenderId,
        input.loans,
        input.overdueMap,
        input.borrowerMap,
        input.preferences,
      ),
      ...this.buildDisputeNotifications(
        input.lenderId,
        input.disputes,
        input.loanMap,
        input.borrowerMap,
        input.preferences,
      ),
      ...this.buildAdNotifications(
        input.lenderId,
        input.ads,
        input.preferences,
      ),
      ...this.buildSystemNotifications(input.lenderId, input.lenderProfile),
    ];
  }

  private buildRequestNotifications(
    lenderId: string,
    requests: RequestRecord[],
    borrowerMap: Map<string, BorrowerProfile>,
    preferences: NotificationGenerationPreferences,
  ): NotificationDraft[] {
    return requests.flatMap((request) => {
      const borrowerName =
        borrowerMap.get(request.borrowerId ?? '')?.fullName ?? 'Borrower';
      const drafts: NotificationDraft[] = [];
      const requestDate = request.updatedAt ?? request.createdAt ?? new Date();
      const isTargeted = Boolean(
        request.adId || request.targetLenderId === lenderId,
      );

      if (
        preferences.inAppNewRequests &&
        ['open', 'matched'].includes(request.status)
      ) {
        drafts.push({
          id: `${isTargeted ? 'targeted' : 'marketplace'}-request-${request.id}`,
          lenderId,
          category: 'loan_request',
          eventType: isTargeted
            ? 'new_targeted_request'
            : 'new_marketplace_request',
          title: isTargeted
            ? 'New targeted loan request'
            : 'New marketplace match',
          message: `${borrowerName} requested ${this.formatCurrency(request.amount)} for ${request.purpose ?? 'a new loan offer'}.`,
          severity: request.urgency === 'critical' ? 'critical' : 'info',
          createdAt: request.createdAt ?? new Date(),
          relatedEntityType: 'loanRequest',
          relatedEntityId: request.id,
          actionLabel: 'Open request',
          actionTarget: 'pending-requests',
          metadata: {
            borrowerId: request.borrowerId ?? '',
            amount: request.amount,
            status: request.status,
            adId: request.adId ?? '',
          },
        });
      }

      if (
        preferences.inAppStatusUpdates &&
        REQUEST_STATUS_UPDATES.has(request.status)
      ) {
        drafts.push({
          id: `request-status-${request.status}-${request.id}`,
          lenderId,
          category: 'loan_request',
          eventType: 'request_status_update',
          title: `Request moved to ${this.formatLabel(request.status)}`,
          message: `${borrowerName}'s request is now ${this.formatLabel(request.status).toLowerCase()}.`,
          severity: request.status === 'approved' ? 'success' : 'warning',
          createdAt: requestDate,
          relatedEntityType: 'loanRequest',
          relatedEntityId: request.id,
          actionLabel: 'Review request',
          actionTarget: 'pending-requests',
          metadata: {
            borrowerId: request.borrowerId ?? '',
            amount: request.amount,
            status: request.status,
            adId: request.adId ?? '',
          },
        });
      }

      return drafts;
    });
  }

  private buildTransactionNotifications(
    lenderId: string,
    transactions: TransactionRecord[],
    loanMap: Map<string, LoanRecord>,
    borrowerMap: Map<string, BorrowerProfile>,
    preferences: NotificationGenerationPreferences,
  ): NotificationDraft[] {
    if (!preferences.inAppTransactions) {
      return [];
    }

    return transactions
      .filter((transaction) => transaction.type === 'repayment')
      .map((transaction) => {
        const loan = transaction.loanId
          ? loanMap.get(transaction.loanId)
          : undefined;
        const borrowerName = loan?.borrowerId
          ? borrowerMap.get(loan.borrowerId)?.fullName
          : null;

        return {
          id: `transaction-repayment-${transaction.id}`,
          lenderId,
          category: 'transaction',
          eventType:
            transaction.amount >= 100000
              ? 'large_repayment_received'
              : 'repayment_received',
          title:
            transaction.amount >= 100000
              ? 'Large repayment received'
              : 'Repayment received',
          message: `${borrowerName ?? 'A borrower'} paid ${this.formatCurrency(transaction.amount)} toward loan ${transaction.loanId ?? 'Unknown'}.`,
          severity: 'success',
          createdAt: transaction.createdAt ?? new Date(),
          relatedEntityType: 'transaction',
          relatedEntityId: transaction.id,
          actionLabel: 'View analytics',
          actionTarget: 'analytics',
          metadata: {
            borrowerId: loan?.borrowerId ?? '',
            loanId: transaction.loanId ?? '',
            amount: transaction.amount,
            status: transaction.status,
          },
        };
      });
  }

  private buildRiskNotifications(
    lenderId: string,
    loans: LoanRecord[],
    overdueMap: Map<string, Date>,
    borrowerMap: Map<string, BorrowerProfile>,
    preferences: NotificationGenerationPreferences,
  ): NotificationDraft[] {
    if (!preferences.inAppOverdues) {
      return [];
    }

    const drafts: NotificationDraft[] = [];

    overdueMap.forEach((createdAt, loanId) => {
      const loan = loans.find((item) => item.id === loanId);
      const borrowerName = loan?.borrowerId
        ? borrowerMap.get(loan.borrowerId)?.fullName
        : null;

      drafts.push({
        id: `risk-overdue-${loanId}`,
        lenderId,
        category: 'repayment_risk',
        eventType: 'loan_overdue',
        title: 'Overdue payment detected',
        message: `${borrowerName ?? 'A borrower'} has an overdue installment on loan ${loanId}.`,
        severity: 'warning',
        createdAt,
        relatedEntityType: 'loan',
        relatedEntityId: loanId,
        actionLabel: 'Open dashboard',
        actionTarget: 'dashboard',
        metadata: {
          borrowerId: loan?.borrowerId ?? '',
          loanId,
          amount: loan?.remainingAmount ?? 0,
          status: loan?.status ?? 'overdue',
        },
      });
    });

    loans
      .filter((loan) => loan.status === 'defaulted')
      .forEach((loan) => {
        const borrowerName = loan.borrowerId
          ? borrowerMap.get(loan.borrowerId)?.fullName
          : null;

        drafts.push({
          id: `risk-defaulted-${loan.id}`,
          lenderId,
          category: 'repayment_risk',
          eventType: 'loan_defaulted',
          title: 'Loan moved to defaulted status',
          message: `${borrowerName ?? 'A borrower'} now has a defaulted loan in your portfolio.`,
          severity: 'critical',
          createdAt: loan.updatedAt ?? loan.createdAt ?? new Date(),
          relatedEntityType: 'loan',
          relatedEntityId: loan.id,
          actionLabel: 'View analytics',
          actionTarget: 'analytics',
          metadata: {
            borrowerId: loan.borrowerId ?? '',
            loanId: loan.id,
            amount: loan.remainingAmount,
            status: loan.status,
          },
        });
      });

    return drafts;
  }

  private buildDisputeNotifications(
    lenderId: string,
    disputes: DisputeRecord[],
    loanMap: Map<string, LoanRecord>,
    borrowerMap: Map<string, BorrowerProfile>,
    preferences: NotificationGenerationPreferences,
  ): NotificationDraft[] {
    if (!preferences.inAppDisputes) {
      return [];
    }

    return disputes.map((dispute) => {
      const loan = dispute.loanId ? loanMap.get(dispute.loanId) : undefined;
      const borrowerName = loan?.borrowerId
        ? borrowerMap.get(loan.borrowerId)?.fullName
        : null;
      const isOpen = ['open', 'under_review'].includes(dispute.status);

      return {
        id: `dispute-${dispute.id}-${dispute.status}`,
        lenderId,
        category: 'dispute',
        eventType: isOpen ? 'dispute_opened' : 'dispute_updated',
        title: isOpen ? 'Dispute needs review' : 'Dispute status updated',
        message: `${borrowerName ?? 'A borrower'} has a ${this.formatLabel(dispute.type).toLowerCase()} dispute on loan ${dispute.loanId ?? 'Unknown'}.`,
        severity: isOpen ? 'critical' : 'info',
        createdAt: dispute.updatedAt ?? dispute.createdAt ?? new Date(),
        relatedEntityType: 'dispute',
        relatedEntityId: dispute.id,
        actionLabel: 'View analytics',
        actionTarget: 'analytics',
        metadata: {
          borrowerId: loan?.borrowerId ?? '',
          loanId: dispute.loanId ?? '',
          status: dispute.status,
        },
      };
    });
  }

  private buildAdNotifications(
    lenderId: string,
    ads: AdRecord[],
    preferences: NotificationGenerationPreferences,
  ): NotificationDraft[] {
    if (!preferences.inAppAdExpiry) {
      return [];
    }

    const now = new Date();
    const soonThreshold = new Date(now);
    soonThreshold.setDate(soonThreshold.getDate() + 7);

    return ads.flatMap((ad) => {
      if (!ad.expiresAt || !['active', 'approved'].includes(ad.status)) {
        return [];
      }

      if (ad.expiresAt < now) {
        return [
          {
            id: `ad-expired-${ad.id}`,
            lenderId,
            category: 'ad',
            eventType: 'ad_expired',
            title: 'Lender ad expired',
            message: `${ad.title} is no longer active because its expiry date passed.`,
            severity: 'warning',
            createdAt: ad.expiresAt,
            relatedEntityType: 'ad',
            relatedEntityId: ad.id,
            actionLabel: 'Open ad page',
            actionTarget: 'create-ad',
            metadata: {
              adId: ad.id,
              status: ad.status,
            },
          } satisfies NotificationDraft,
        ];
      }

      if (ad.expiresAt <= soonThreshold) {
        return [
          {
            id: `ad-expiring-${ad.id}`,
            lenderId,
            category: 'ad',
            eventType: 'ad_expiring_soon',
            title: 'Lender ad expires soon',
            message: `${ad.title} will expire on ${this.formatDate(ad.expiresAt)}.`,
            severity: 'warning',
            createdAt: ad.updatedAt ?? ad.expiresAt,
            relatedEntityType: 'ad',
            relatedEntityId: ad.id,
            actionLabel: 'Manage ad',
            actionTarget: 'create-ad',
            metadata: {
              adId: ad.id,
              status: ad.status,
            },
          } satisfies NotificationDraft,
        ];
      }

      return [];
    });
  }

  private buildSystemNotifications(
    lenderId: string,
    lenderProfile: LenderProfile,
  ): NotificationDraft[] {
    const drafts: NotificationDraft[] = [
      {
        id: `system-temporary-auth-${lenderId}`,
        lenderId,
        category: 'system',
        eventType: 'temporary_auth_notice',
        title: 'Temporary sign-in is active',
        message:
          'This lender workspace still uses temporary session auth. Security controls will move into the real auth service later.',
        severity: 'info',
        createdAt: new Date('2026-04-20T00:00:00.000Z'),
        relatedEntityType: 'system',
        relatedEntityId: null,
        actionLabel: 'Open settings',
        actionTarget: 'settings',
        metadata: {},
      },
    ];

    if (lenderProfile.kycStatus !== 'approved') {
      drafts.push({
        id: `system-kyc-${lenderId}`,
        lenderId,
        category: 'system',
        eventType: 'kyc_reminder',
        title: 'KYC still needs attention',
        message: `Your current KYC status is ${this.formatLabel(lenderProfile.kycStatus).toLowerCase()}. Some workflows may stay limited until this is completed.`,
        severity: 'warning',
        createdAt: new Date('2026-04-20T00:00:00.000Z'),
        relatedEntityType: 'system',
        relatedEntityId: null,
        actionLabel: 'Review settings',
        actionTarget: 'settings',
        metadata: {
          status: lenderProfile.kycStatus,
        },
      });
    }

    if (
      !lenderProfile.businessName ||
      !lenderProfile.city ||
      !lenderProfile.district ||
      !lenderProfile.email
    ) {
      drafts.push({
        id: `system-profile-${lenderId}`,
        lenderId,
        category: 'system',
        eventType: 'profile_incomplete',
        title: 'Profile details need completion',
        message:
          'Business name, location, or contact details are still missing. Completing them improves borrower trust and future automation.',
        severity: 'info',
        createdAt: new Date('2026-04-20T00:00:00.000Z'),
        relatedEntityType: 'system',
        relatedEntityId: null,
        actionLabel: 'Open settings',
        actionTarget: 'settings',
        metadata: {},
      });
    }

    return drafts;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      maximumFractionDigits: 0,
    }).format(value);
  }

  private formatDate(value: Date): string {
    return new Intl.DateTimeFormat('en-LK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(value);
  }

  private formatLabel(value: string): string {
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }
}
