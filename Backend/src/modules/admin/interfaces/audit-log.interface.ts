export type AuditActionType =
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'user_suspended'
  | 'user_activated'
  | 'ad_approved'
  | 'ad_rejected'
  | 'dispute_updated'
  | 'report_generated'
  | 'system_event';

export type AuditSeverity = 'info' | 'warning' | 'critical' | 'success';

export interface AuditLogEntry {
  id: string;
  actionType: AuditActionType;
  description: string;
  performedBy: string;
  targetName: string;
  targetType: 'user' | 'ad' | 'dispute' | 'transaction' | 'system' | 'report';
  dateTime: string;
  severity: AuditSeverity;
}
