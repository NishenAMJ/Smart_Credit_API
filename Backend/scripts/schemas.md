# Smart Credit Firestore Schemas

Last audited: 2026-08-18

This document inventories every Firestore collection path referenced by the
backend or database seed scripts. The schema-v2 seed fields are the canonical
shape. Fields marked **runtime/legacy** are also read or written by current
services and show where the application has not yet been fully migrated to the
canonical model.

## Conventions

- Money fields ending in `Minor` are integer LKR minor units (cents).
- Other money fields such as `amount` are legacy LKR major-unit values.
- Dates should be Firestore `Timestamp` values. `null` means intentionally not
  set; `?` means the field may be absent.
- Relationships are stored as string IDs, not Firestore document references.
- Seed writes use deterministic document IDs and merge upserts.

## Collection index

| Collection/path                           | Document ID                      | Written by seed           |
| ----------------------------------------- | -------------------------------- | ------------------------- |
| `users`                                   | `userId`                         | Yes                       |
| `authCredentials`                         | Same as `userId`                 | Yes                       |
| `documents`                               | `documentId` / generated ID      | Yes                       |
| `kycSubmissions`                          | `submissionId`                   | Yes                       |
| `loanListings`                            | `listingId`                      | Yes                       |
| `loanApplications`                        | `applicationId`                  | Yes                       |
| `loans`                                   | `loanId`                         | Yes                       |
| `loans/{loanId}/installments`             | `month_NNN`                      | Yes                       |
| `transactions`                            | `transactionId`                  | Yes                       |
| `disputes`                                | `disputeId`                      | Yes                       |
| `disputes/{disputeId}/events`             | `eventId`                        | Yes                       |
| `notifications`                           | `notificationId`                 | Yes                       |
| `conversations`                           | `conversationId` / generated ID  | Yes                       |
| `conversations/{conversationId}/messages` | `messageId` / generated ID       | Yes                       |
| `blocks`                                  | Generated ID                     | No                        |
| `legalDocuments`                          | `legalDocumentId` / generated ID | Yes                       |
| `legalAcceptances`                        | `acceptanceId`                   | Yes                       |
| `userLocations`                           | Same as `userId`                 | Yes                       |
| `auditLogs`                               | `auditLogId`                     | Yes                       |
| `lenderSettings`                          | Same as `lenderId`               | No                        |
| `lenderNotificationSync`                  | Same as `lenderId`               | No (read only at present) |
| `systemSettings`                          | Setting-specific ID              | No                        |
| `smsDeliveries`                           | Deterministic event ID            | No                        |

## Canonical collections

### `users/{userId}`

```text
userId: string
email: string
phone: string
fullName: string
photoUrl: string | null
roles: ('borrower' | 'lender' | 'admin')[]
accountStatus: 'pending' | 'active' | 'suspended' | 'closed'
kycStatus: 'not_submitted' | 'pending' | 'approved' | 'rejected'
borrowerProfile: {
  dateOfBirth: Timestamp | null
  occupation: string | null
  monthlyIncomeMinor: number | null
  creditScore: number | null
} | null
lenderProfile: {
  businessName: string | null
  registrationNumber: string | null
  description: string | null
  rating: number
} | null
createdAt: Timestamp
updatedAt: Timestamp
lastLoginAt: Timestamp | null
```

Runtime/legacy user fields also observed: `uid`, `role`, `emailLower`,
`phoneNormalized`, `nic`, `dateOfBirth`, `photoURL`, `profilePicture`,
`passwordHash`, `creditScore`, `rating`, `totalLoansCompleted`,
`totalAmountLent`, `totalAmountBorrowed`, `authProvider`, `notes`,
`rejectionReason`, `kycFiles`, `username`, `displayName`, `avatarUrl`,
`fcmToken`, `isOnline`, and `lastSeen`. Passwords should only be retained in
`authCredentials`; the top-level legacy `passwordHash` should be migrated away.

### `authCredentials/{userId}`

```text
userId: string
passwordHash: string (bcrypt)
passwordChangedAt: Timestamp
failedLoginAttempts: number
lockedUntil: Timestamp | null
createdAt: Timestamp
updatedAt: Timestamp
```

### `documents/{documentId}`

Canonical seed record:

```text
documentId: string
ownerUserId: string
category: string
storagePath: string
fileName: string
contentType: string
sizeBytes: number
checksum: string | null
status: string
uploadedAt: Timestamp
verifiedAt: Timestamp | null
verifiedByUserId: string | null
```

Current upload service record (runtime/legacy alternative):

```text
id: string
userId: string
fullName?: string
email?: string
phone?: string
userKycStatus?: string
category: 'kyc' | 'agreement'
documentType: string
originalFilename: string
mimeType: string
fileHash: string
cloudinaryAssetId: string
cloudinaryPublicId: string
cloudinaryResourceType: string
cloudinaryDeliveryType: string
cloudinarySecureUrl?: string
cloudinaryVersion?: number
format?: string
fileSize: number
uploadStatus: 'uploaded' | 'failed'
status: 'pending_review' | 'approved' | 'rejected' | 'expired' | 'deleted'
source: 'user_upload' | 'system_generated'
relatedEntityType?: 'user' | 'loan' | 'legal_document'
relatedEntityId?: string
displayName?: string
uploadedAt: Timestamp
createdAt: Timestamp
updatedAt: Timestamp
deletedAt?: Timestamp
reviewerId?: string
reviewTimestamp?: Timestamp
reviewNotes?: string
review?: { reviewedAt?, reviewedBy?, rejectionReason?, notes? }
deletion?: { deletedAt?, deletedBy?, reason? }
```

### `kycSubmissions/{submissionId}`

```text
submissionId: string
userId: string
role: 'borrower' | 'lender'
status: 'pending' | 'approved' | 'rejected'
documentIds: string[]
submittedAt: Timestamp
reviewedAt: Timestamp | null
reviewedByAdminId: string | null
rejectionReason: string | null
createdAt: Timestamp
updatedAt: Timestamp
```

The current KYC service mainly records review state in `documents` and
`users`; `kycSubmissions` is presently populated only by the seed.

### `loanListings/{listingId}`

```text
listingId: string
lenderId: string
title: string
description: string
purposeCategories: string[]
minAmountMinor: number
maxAmountMinor: number
minInterestRateAnnual: number
maxInterestRateAnnual: number
minTenureMonths: number
maxTenureMonths: number
availableCapitalMinor: number
currency: 'LKR'
repaymentFrequency: 'monthly'
status: 'draft' | 'pending_review' | 'active' | 'paused' | 'rejected' |
        'expired' | 'closed'
adminReview: {
  reviewedBy: string | null
  reviewedAt: Timestamp | null
  rejectionReason: string | null
}
publishedAt: Timestamp | null
expiresAt: Timestamp | null
createdAt: Timestamp
updatedAt: Timestamp
```

Runtime addition: `location?: string`. Response-only calculated attributes
such as application counts, lender name, search keywords, and boosted state
are not stored by the current listing writer.

### `loanApplications/{applicationId}`

```text
applicationId: string
listingId: string
lenderId: string
borrowerId: string
requestedPrincipalMinor: number
requestedTenureMonths: number
requestedPurpose: string
purposeDescription: string
status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' |
        'withdrawn' | 'converted'
lenderDecision: {
  approvedPrincipalMinor: number | null
  annualInterestRate: number | null
  approvedTenureMonths: number | null
  decisionNote: string | null
  decidedAt: Timestamp | null
}
convertedLoanId: string | null
submittedAt: Timestamp | null
createdAt: Timestamp
updatedAt: Timestamp
```

Runtime/legacy readers also accept `requestId`, `adId`, `targetLenderId`,
`userId`, `amount`, `tenureMonths`, `purpose`, `purposeCategory`,
`suggestedInterestRate`, `urgency`, `monthlyIncome`, `incomeSource`,
`requestedRegion`, `collateralOffered`, `matchedLenderIds`, and `notes`.

### `loans/{loanId}`

```text
loanId: string
applicationId: string
listingId: string
lenderId: string
borrowerId: string
currency: 'LKR'
principalMinor: number
annualInterestRate: number
interestAmountMinor: number
totalRepayableMinor: number
monthlyInstallmentMinor: number
tenureMonths: number
amountPaidMinor: number
remainingBalanceMinor: number
status: 'pending_disbursement' | 'active' | 'overdue' | 'completed' |
        'defaulted' | 'cancelled'
approvedAt: Timestamp
disbursedAt: Timestamp | null
firstPaymentDueAt: Timestamp | null
maturityDate: Timestamp | null
completedAt: Timestamp | null
termsVersion: number
createdAt: Timestamp
updatedAt: Timestamp
```

Runtime/legacy loan creation also writes `adId`, `amount`, `interestRate`,
`durationMonths`, `repaymentSchedule`, `nextDueDate`, `lenderName`,
`borrowerName`, and `borrowerCreditScore`.

### `loans/{loanId}/installments/{installmentId}`

```text
installmentId: string                 # month_001, month_002, ...
loanId: string
lenderId: string
borrowerId: string
sequence: number
currency: 'LKR'
amountDueMinor: number
status: 'scheduled' | 'due' | 'paid' | 'overdue' | 'waived'
dueAt: Timestamp
paidTransactionId: string | null
paidAt: Timestamp | null
note: string | null
createdAt: Timestamp
updatedAt: Timestamp
```

### `transactions/{transactionId}`

```text
transactionId: string
type: 'disbursement' | 'repayment' | 'platform_fee' | 'listing_boost' |
      'refund' | 'adjustment'
status: 'pending' | 'completed' | 'failed' | 'reversed'
currency: 'LKR'
amountMinor: number
lenderId: string | null
borrowerId: string | null
loanId: string | null
installmentId: string | null
listingId: string | null
paymentMethod: 'bank_transfer' | 'qr' | 'cash' | 'card' | 'system' | null
externalReference: string | null
idempotencyKey: string
receiptDocumentId: string | null
note: string | null
initiatedByUserId: string
completedAt: Timestamp | null
createdAt: Timestamp
```

Runtime/legacy readers also accept `amount`, `lenderName`, `lenderEmail`,
`borrowerName`, and `borrowerEmail`.

### `disputes/{disputeId}`

```text
disputeId: string
openedByUserId: string
complainantId: string
respondentId: string
assignedAdminId: string | null
loanId: string | null
installmentId: string | null
transactionId: string | null
category: string
subject: string
description: string
evidenceDocumentIds: string[]
status: string
resolution: string | null
resolvedAt: Timestamp | null
createdAt: Timestamp
updatedAt: Timestamp
```

Runtime/legacy dispute fields: `id`, `disputeCode`, `lenderId`, `borrowerId`,
`lenderName`, `borrowerName`, `lenderPhotoURL`, `borrowerPhotoURL`, `raisedBy`,
`raisedByUserId`, `raisedByRole`, `againstUser`, `againstUserId`,
`againstUserRole`, `title`, `priority`, `disputedAmount`, `evidenceUrls`,
`statusHistory`, `escalatedAt`, `escalationReason`, `notes`, and `assignedTo`.

### `disputes/{disputeId}/events/{eventId}`

```text
disputeId: string
eventId: string
actorUserId: string
type: string
message: string
previousStatus: string | null
nextStatus: string | null
documentIds: string[]
createdAt: Timestamp
```

### `notifications/{notificationId}`

```text
notificationId: string
userId: string
category: string
eventType?: string
title: string
body: string
severity?: 'info' | 'success' | 'warning' | 'critical'
entityType: string | null
entityId: string | null
actionLabel?: string | null
actionTarget?: string | null
metadata?: Record<string, string | number>
isRead: boolean
readAt: Timestamp | null
createdAt: Timestamp
```

The seed uses the common subset. Lender notification synchronization adds the
optional event, severity, action, and metadata fields.

### `conversations/{conversationId}`

Canonical seed record:

```text
conversationId: string
participantIds: string[]
contextType: string
contextId: string
lastMessage: {
  messageId: string
  senderId: string
  preview: string
  sentAt: Timestamp
} | null
createdAt: Timestamp
updatedAt: Timestamp
```

Current chat runtime alternative:

```text
participantIds: [string, string]      # sorted
key: string                           # participantIds joined with "_"
lastMessage: { text, senderId, createdAt } | null
unreadCounts: Record<userId, number>
mutedBy: string[]
createdAt: Timestamp
```

### `conversations/{conversationId}/messages/{messageId}`

Canonical seed record:

```text
conversationId: string
messageId: string
senderId: string
type: 'text' | string
text: string | null
documentId: string | null
readByUserIds: string[]
sentAt: Timestamp
editedAt: Timestamp | null
deletedAt: Timestamp | null
```

Current chat runtime alternative:

```text
conversationId: string
senderId: string
text: string | null
mediaUrl: string | null
mediaType: 'image' | 'video' | 'file' | null
fileName: string | null
readAt: Timestamp | null
status: 'sent' | 'delivered' | 'read'
createdAt: Timestamp
```

### `legalDocuments/{legalDocumentId}`

Seeded platform-terms record:

```text
legalDocumentId: string
type: string
version: number
title: string
content: string
status: string
publishedAt: Timestamp | null
createdByAdminId: string
createdAt: Timestamp
updatedAt: Timestamp
```

Loan contracts are stored separately from platform legal documents:

### `loanAgreements/{agreementId}`

```text
agreementId, loanId, applicationId, listingId: string
version: number
status: awaiting_signatures | partially_accepted | finalizing |
  finalization_failed | fully_accepted | superseded | cancelled
borrowerId, lenderId: string
borrower, lender: { userId, fullName, email, phone, role }
terms: {
  currency, principalMinor, annualInterestRate, interestAmountMinor,
  totalRepayableMinor, monthlyInstallmentMinor, tenureMonths,
  repaymentFrequency, repaymentStartRule
}
bodyHtml, termsHash, consentTextVersion: string
borrowerAcceptance, lenderAcceptance: { accepted, signedName, acceptedAt }
signedPdfDocumentId, pdfSha256Hash: string | null
generatedAt, updatedAt, finalizedAt: Timestamp | null
```

### `loanAgreementAcceptances/{acceptanceId}`

Append-only party consent record containing the agreement/version/hash, typed
legal name, role, hashed IP address, user agent, and acceptance timestamp.

### `legalAcceptances/{acceptanceId}`

```text
acceptanceId: string
userId: string
legalDocumentId: string
documentVersion: number
acceptedAt: Timestamp
ipAddressHash: string | null
userAgent: string
```

### `userLocations/{userId}`

```text
userId: string
role: 'borrower' | 'lender' | 'admin'
latitude: number
longitude: number
geohash: string
city?: string
district?: string
visibility: 'hidden' | 'approximate' | 'exact'
updatedAt: Timestamp
```

Older seeded location records may lack `visibility`; runtime nearby searches
require it. New lender seed records should eventually set `visibility`.

### `auditLogs/{auditLogId}`

Canonical seed record:

```text
auditLogId: string
actorUserId: string
actorRole: string
action: string
entityType: string
entityId: string
before: Record<string, unknown> | null
after: Record<string, unknown> | null
metadata: Record<string, unknown>
createdAt: Timestamp
```

The admin API also maps legacy log fields `id`, `actionType`, `description`,
`performedBy`, `targetName`, `targetType`, `dateTime`, and `severity`.

## Runtime-only collections

### `blocks/{generatedId}`

```text
blockerId: string
blockedId: string
createdAt: Timestamp
```

### `lenderSettings/{lenderId}`

```text
lenderId: string
notifications: {
  inAppNewRequests, emailNewRequests,
  inAppTransactions, emailTransactions,
  inAppStatusUpdates, emailStatusUpdates,
  inAppOverdues, emailOverdues,
  inAppAdExpiry, emailAdExpiry,
  inAppDisputes, emailDisputes: boolean
}
lendingDefaults: {
  defaultInterestRate: number
  defaultMaxTenureMonths: number
  defaultMinAmount: number
  defaultMaxAmount: number
  preferredPurposes: string[]
  preferredRegions: string[]
  defaultResponseTimeHours: number
}
workspace: {
  defaultLandingPage: 'dashboard' | 'analytics'
  defaultAnalyticsRange: '30d' | '90d' | '365d'
  pendingRequestsPageSize: number
  borrowerTablePageSize: number
}
updatedAt: Timestamp
```

### `lenderNotificationSync/{lenderId}`

```text
lastSyncedAt: Timestamp
```

This collection is currently read by the notification service, while the same
service writes synchronization time to `systemSettings`; see the drift note.

### `systemSettings/{settingId}`

Known notification-sync document (`notification_sync_{lenderId}`):

```text
lenderId: string
lastSyncedAt: Timestamp
```

Known lender SMS document (`sms_{lenderId}`):

```text
settingType: 'lender_sms'
lenderId: string
enabled: boolean
paymentReceived: {
  enabled: boolean
  template: string
  updatedAt: Timestamp
}
updatedAt: Timestamp
```

The main SMS switch is checked before every manual and automatic provider
request. When both switches are enabled, a successfully recorded installment
payment renders the saved template with `{{borrowerName}}`, `{{amount}}`,
`{{paymentDate}}`, and `{{remainingBalance}}`. Successful manual deliveries add
an `auditLogs` record with action `sms.sent`; successful automatic deliveries
use `sms.payment_received.sent`. Provider credentials are environment variables
and are never stored in Firestore.

The collection is intended for additional platform settings, so other document
IDs may use setting-specific attributes.

### `smsDeliveries/{deliveryId}`

Automatic payment messages use the deterministic ID
`payment_received_{transactionId}` so the same repayment cannot send twice.

```text
deliveryId: string
type: 'payment_received'
status: 'sent'
lenderId: string
borrowerId: string
loanId: string
transactionId: string
providerMessageId: string | null
messageHash: string
createdAt: Timestamp
sentAt: Timestamp
```

The borrower phone number, message content, and SMS credentials are not stored
in this delivery record.

## Required relationship rules

- Every credential, profile, KYC submission, location, acceptance, and
  notification user ID must resolve to `users`.
- Every application must resolve its listing, lender, and borrower.
- Every loan must resolve its application, listing, lender, and borrower.
- A converted application's `convertedLoanId` must identify exactly one loan.
- Installment IDs use `month_NNN`; installment amounts must sum exactly to the
  loan's `totalRepayableMinor`.
- A paid installment points to a top-level transaction named
  `repayment_{loanId}_{installmentId}`.
- `amountPaidMinor + remainingBalanceMinor` must equal
  `totalRepayableMinor`.
- Nested messages must resolve their parent conversation and participant
  sender; dispute events must resolve their parent dispute.

## Known schema drift to resolve

1. `documents`, `conversations`, `messages`, `legalDocuments`, `disputes`,
   `users`, and `loans` each have canonical and runtime/legacy shapes.
2. `lenderNotificationSync` is read, but synchronization state is written to
   `systemSettings/notification_sync_{lenderId}`. Choose one location.
3. Seeded `userLocations` omit `visibility`, while runtime search requires it.
4. `Backend/src/common/firestore/schema.ts` lists all canonical collection
   names but currently declares interfaces only through `transactions`.
5. Future work should migrate legacy fields and then enforce one shared set of
   TypeScript interfaces or Firestore converters at every write boundary.
