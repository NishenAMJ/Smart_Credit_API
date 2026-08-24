# Workflow matrix

Legend: **Automated** is in the default quality gate; **Unit** has service or
controller regression coverage; **Playwright** is browser E2E; **Maestro** is
an implemented device smoke flow; **Device acceptance** is a documented manual
device check that remains outside the automated release gate; **Sandbox**
requires external provider credentials.

| Actor / workflow | Preconditions and action | Expected canonical result | UI / notification result | Coverage |
| --- | --- | --- | --- | --- |
| Public registration | Unique email/phone, borrower or lender role | User and credential records created; KYC `not_submitted` | Account-created result; no secrets returned | Automated API E2E + Unit |
| Public login/session/logout | Valid credentials and active account | JWT role matches canonical user role; logout clears client storage | Correct workspace restored | Automated API E2E + Playwright + Maestro |
| Borrower profile/email/password update | Authenticated borrower and current password | Canonical user and bcrypt credential update atomically; old password rejected | Updated profile; invalid/current-password errors are explicit | Automated API E2E + Unit |
| Lender password update | Authenticated lender and current password | Canonical auth credential updated | Profile confirmation/error state | Automated API contract + Device acceptance |
| Suspended/deleted/stale-role session | Existing or fresh token | Guard rejects before domain handler | Signed out/forbidden state | Automated API E2E + Unit |
| Borrower/lender KYC submit | Authenticated account and required images | Three secured document records; user KYC `pending` | One grouped submission, pending state | Automated API E2E + Playwright |
| Admin KYC approve | Complete pending submission | All files approved; user approved; borrower profile synchronized | Counts/history update; participant notice | Automated API E2E + Playwright + Unit |
| Admin KYC reject | Complete pending submission and reason | All files rejected; user rejected | Actionable rejection notification | Automated API E2E + Unit |
| KYC resubmit | Rejected user with existing JWT | Replacement files pending; old files remain rejected history | No new login; pending state | Automated API E2E + Device acceptance |
| Lender listing create/edit/publish | Approved lender; valid ranges | Canonical minor-unit terms; controlled status transition | Active/history and analytics agree | Unit |
| Admin listing review | Admin and pending listing | Listing approval/rejection plus audit event | Marketplace visibility and notice agree | Unit |
| Borrower marketplace search/details | Approved borrower; active listings | Read-only active listing query | Filters, pagination, empty/loading state | Seed validation + Device acceptance |
| Application create/submit | Approved borrower and active listing | Canonical submitted application, score snapshot, lender link; retry returns the same application | Borrower history and lender queue agree | Automated API E2E + Unit |
| Application edit/delete | Borrower-owned draft | Only draft may change or delete | Immediate refreshed state | Unit |
| Application review/reject | Owning lender and actionable state | Atomic allowed transition and decision note | Both histories update | Unit |
| Application approve/convert | Owning lender; valid listing terms | One loan, agreement, application link, participant notices | Retry returns same IDs | Automated API E2E + Unit |
| Agreement acceptance | Correct participant and order | Versioned acceptance record | Realtime participant status | Automated API E2E + Unit |
| Disbursement/activation | Lender accepted and transfer confirmed, borrower accepted | Loan active; repayment schedule created exactly once | Both parties notified | Automated API E2E + Unit |
| Agreement download/history | Participant or admin | Authorized immutable agreement view | Secure download/history | Unit |
| Installment settlement | Active/overdue loan and unpaid installment | Deterministic ledger entry, paid installment, atomic balance | Receipt/history/balance agree | Automated API E2E + Unit |
| PayHere initiate/callback | Active installment and valid signature | Callback accepted once; invalid/replay rejected | Payment status and receipt agree | Unit + Sandbox |
| QR generate/verify | Eligible installment; unexpired token | One settlement; expiry/replay rejected | Lender validation and borrower history agree | Unit + Device acceptance |
| Dispute create | Participant-owned eligible loan and complete fields | One dispute and shared created event | Admin count and both timelines update | Automated API E2E + Unit + Device acceptance |
| Dispute evidence/comments/info | Authorized participant/admin | Secured document IDs and visibility-safe events | Ordered realtime timeline | Unit |
| Dispute assignment/escalation/resolution | Admin and allowed state | Valid transition, priority, resolution/reopen window | Admin counts and participant notice | Unit + Playwright |
| Dispute acknowledgement/reopen/close | Participant and allowed window | Atomic acknowledgement or reopen/close event | Both participants agree | Unit |
| Chat create/send/read | Two valid participants, no block | Conversation/message/read state consistent | Delivery, unread and reconnect state | Unit + Device acceptance |
| Notification list/read | Authenticated owner | `isRead` and `readAt` consistent | Unread badge and deep link update | Unit + Device acceptance |
| Profiles/credit score | Authenticated owner | Canonical profile and score history | Dashboard reflects current values | Unit |
| Location/nearby users | Explicit device permission | Only allowed coordinates/query fields | Denied/empty/loading states safe | Device acceptance |
| Support/reminders/SMS settings | Authenticated owner | Owner-scoped records and preferences | Action confirmation; provider failure safe | Unit + Sandbox |
| Admin users/audit/analytics/reports | Admin role | Paginated queries and audit entries | Search/filter/export/empty states | Unit + volume seed |
| AI assistant | Authenticated supported role | Role router restricts tools and data | Safe response/provider failure | Unit + Sandbox |
