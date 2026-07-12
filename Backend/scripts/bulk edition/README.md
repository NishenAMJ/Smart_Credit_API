# Bulk Edition Database Seed

This folder contains the large Firestore data seeder. It follows the
canonical database model in `Backend/src/common/firestore/schema.ts`.

## Files

| File               | Responsibility                                                  |
| ------------------ | --------------------------------------------------------------- |
| `run.js`           | Validates fixtures and writes them to Firestore in batches      |
| `check.js`         | Builds and validates data without connecting to Firestore       |
| `config.js`        | Reads and validates seed settings from `Backend/.env`           |
| `fixtures.js`      | Defines the four stable development accounts and base records   |
| `bulk-fixtures.js` | Generates the configurable bulk dataset and relationships       |
| `validate.js`      | Checks IDs, references, credentials, installments, and balances |

The shared Firebase initialization and batch writer live in `../shared/`.

## Commands

Run commands from `Backend/`:

```bash
# Safe: generate and validate the full configured dataset without database writes
npm run seed:check

# Safe: validate a small dataset
npm run seed:check:small

# Writes to the Firebase project configured in Backend/.env
npm run seed
```

`npm run seed` refuses to write unless `SEED_ENABLED=true`. The seeder uses
merge upserts, deterministic document IDs, and never deletes database records.
Running the same batch again updates the same seed documents.

## Environment settings

Copy the required non-secret settings from `Backend/.env.seed.example` into
`Backend/.env`. Firebase credentials remain in the same `.env` file.

| Variable                 |            Default | Meaning                                        |
| ------------------------ | -----------------: | ---------------------------------------------- |
| `SEED_ENABLED`           |            `false` | Must be `true` to permit Firestore writes      |
| `SEED_RANDOM_SEED`       | `smart-credit-dev` | Makes generated values repeatable              |
| `SEED_BATCH_ID`          |         `bulk_dev` | Unique namespace included in bulk document IDs |
| `SEED_LENDER_COUNT`      |              `300` | Additional lender accounts                     |
| `SEED_BORROWER_COUNT`    |              `699` | Additional borrower accounts                   |
| `SEED_LISTING_COUNT`     |              `600` | Additional loan listings                       |
| `SEED_APPLICATION_COUNT` |             `1500` | Additional loan applications                   |
| `SEED_LOAN_COUNT`        |              `800` | Applications converted into loans              |
| `SEED_DEFAULT_PASSWORD`  |  `SmartCredit@123` | Password for generated accounts                |

`SEED_LOAN_COUNT` cannot exceed `SEED_APPLICATION_COUNT`. Listings require at
least one lender; applications require at least one listing and borrower.

## Collection structure and attributes

Money is stored as integer LKR minor units in fields ending in `Minor`. Dates
are written as Firestore timestamps. Status values are lowercase. References
are string IDs rather than Firestore document references.

| Collection/path                           | Document ID       | Attributes                                                                                                                                                                                                  |
| ----------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`                                   | `userId`          | `userId`, `email`, `phone`, `fullName`, `photoUrl`, `roles`, `accountStatus`, `kycStatus`, `borrowerProfile`, `lenderProfile`, `createdAt`, `updatedAt`, `lastLoginAt`                                      |
| `authCredentials`                         | Same as `userId`  | `userId`, `passwordHash`, `passwordChangedAt`, `failedLoginAttempts`, `lockedUntil`, `createdAt`, `updatedAt`                                                                                               |
| `documents`                               | `documentId`      | `documentId`, `ownerUserId`, `category`, `storagePath`, `fileName`, `contentType`, `sizeBytes`, `checksum`, `status`, `uploadedAt`, `verifiedAt`, `verifiedByUserId`                                        |
| `kycSubmissions`                          | `submissionId`    | `submissionId`, `userId`, `role`, `status`, `documentIds`, `submittedAt`, `reviewedAt`, `reviewedByAdminId`, `rejectionReason`, `createdAt`, `updatedAt`                                                    |
| `loanListings`                            | `listingId`       | `listingId`, `lenderId`, `title`, `description`, `purposeCategories`, amount/rate/tenure limits, `availableCapitalMinor`, `currency`, `repaymentFrequency`, `status`, `adminReview`, publication timestamps |
| `loanApplications`                        | `applicationId`   | `applicationId`, `listingId`, `lenderId`, `borrowerId`, requested terms, purpose fields, `status`, `lenderDecision`, `convertedLoanId`, timestamps                                                          |
| `loans`                                   | `loanId`          | Participant and source IDs, agreed financial terms, totals and balances, `status`, approval/disbursement/payment/maturity/completion timestamps, `termsVersion`                                             |
| `loans/{loanId}/installments`             | `month_NNN`       | `installmentId`, `loanId`, `lenderId`, `borrowerId`, `sequence`, `currency`, `amountDueMinor`, `status`, `dueAt`, `paidTransactionId`, `paidAt`, `note`, timestamps                                         |
| `transactions`                            | `transactionId`   | `type`, `status`, `currency`, `amountMinor`, participant/source IDs, `paymentMethod`, `externalReference`, `idempotencyKey`, receipt/note fields, initiator and timestamps                                  |
| `disputes`                                | `disputeId`       | Participant/admin IDs, optional loan/installment/transaction IDs, category, subject, description, evidence IDs, status, resolution, timestamps                                                              |
| `disputes/{disputeId}/events`             | `eventId`         | `disputeId`, `eventId`, `actorUserId`, `type`, `message`, previous/next status, `documentIds`, `createdAt`                                                                                                  |
| `notifications`                           | `notificationId`  | `notificationId`, `userId`, `category`, `title`, `body`, `entityType`, `entityId`, `isRead`, `readAt`, `createdAt`                                                                                          |
| `conversations`                           | `conversationId`  | `conversationId`, `participantIds`, `contextType`, `contextId`, `lastMessage`, timestamps                                                                                                                   |
| `conversations/{conversationId}/messages` | `messageId`       | `conversationId`, `messageId`, `senderId`, `type`, `text`, `documentId`, `readByUserIds`, sent/edit/delete timestamps                                                                                       |
| `legalDocuments`                          | `legalDocumentId` | `legalDocumentId`, `type`, `version`, `title`, `content`, `status`, `publishedAt`, `createdByAdminId`, timestamps                                                                                           |
| `legalAcceptances`                        | `acceptanceId`    | `acceptanceId`, `userId`, `legalDocumentId`, `documentVersion`, `acceptedAt`, `ipAddressHash`, `userAgent`                                                                                                  |
| `userLocations`                           | Same as `userId`  | `userId`, `role`, `latitude`, `longitude`, `geohash`, `city`, `district`, `updatedAt`                                                                                                                       |
| `auditLogs`                               | `auditLogId`      | `auditLogId`, actor fields, `action`, entity fields, `before`, `after`, `metadata`, `createdAt`                                                                                                             |

### Nested profile attributes

| Object            | Attributes                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| `borrowerProfile` | `dateOfBirth`, `occupation`, `monthlyIncomeMinor`, `creditScore`                                    |
| `lenderProfile`   | `businessName`, `registrationNumber`, `description`, `rating`                                       |
| `adminReview`     | `reviewedBy`, `reviewedAt`, `rejectionReason`                                                       |
| `lenderDecision`  | `approvedPrincipalMinor`, `annualInterestRate`, `approvedTenureMonths`, `decisionNote`, `decidedAt` |
| `lastMessage`     | `messageId`, `senderId`, `preview`, `sentAt`                                                        |

## Important relationships

```text
users
  ├─ authCredentials / KYC / documents / locations
  └─ loanListings
       └─ loanApplications
            └─ loans
                 ├─ installments
                 ├─ transactions
                 ├─ disputes
                 └─ conversations
```

- Each converted application identifies exactly one loan.
- Installments use `month_001`, `month_002`, and so on.
- A paid installment points to a top-level transaction named
  `repayment_{loanId}_{installmentId}`.
- There is no nested `payments` collection.
- Installment amounts sum exactly to `totalRepayableMinor`; any rounding
  remainder is placed in the final installment.
- `amountPaidMinor + remainingBalanceMinor` equals `totalRepayableMinor`.

## Stable development accounts

The base fixtures retain `admin_001`, `lender_001`, `borrower_001`, and
`multi_role_001`. Generated accounts use `SEED_DEFAULT_PASSWORD`; their email
addresses are deterministic and visible in the generated `users` fixtures.
