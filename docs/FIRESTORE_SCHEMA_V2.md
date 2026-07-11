# Smart Credit Firestore Schema v2

The NestJS backend is the only business-data gateway. Client Firestore rules deny all direct reads and writes; Firebase Admin SDK operations from the backend bypass those rules.

## Canonical collections

| Collection | Purpose | Primary relationships |
| --- | --- | --- |
| `users` | Canonical profiles and role-specific profile maps | Referenced by every owned record |
| `authCredentials` | Backend-only bcrypt hashes and lock state | Document ID equals `users/{userId}` |
| `documents` | Cloud-storage metadata | Owner and optional verifier reference users |
| `kycSubmissions` | Versioned borrower/lender KYC reviews | User, documents, reviewing admin |
| `loanListings` | Lender lending advertisements | Lender user |
| `loanApplications` | Borrower application to one listing | Listing, lender, borrower, optional converted loan |
| `loans` | Immutable agreed terms and current balance | Application, listing, lender, borrower |
| `loans/{loanId}/installments` | One document per monthly settlement | Parent loan and optional repayment transaction |
| `transactions` | Immutable disbursement/repayment/fee ledger | Loan, installment, listing and participants |
| `disputes` | Admin-managed cases | Loan, optional installment/transaction and participants |
| `disputes/{disputeId}/events` | Append-only dispute timeline | Parent dispute and actor |
| `notifications` | Unified role-independent alerts | Recipient user and related entity |
| `conversations` | Chat participant/context header | Users and optional business entity |
| `conversations/{conversationId}/messages` | Conversation-scoped messages | Parent conversation, sender, optional document |
| `legalDocuments` | Versioned platform agreements | Creating admin |
| `legalAcceptances` | User acceptance evidence | User and legal document/version |
| `userLocations` | Geohash-backed nearby-user discovery | User |
| `auditLogs` | Immutable admin/security events | Actor and affected entity |
| `systemSettings` | Backend operational state | No client access |

Money is stored as integer minor units in `*Minor` fields. Dates are Firestore timestamps. Statuses are lowercase canonical values. IDs are stored as strings to support indexed queries without loading referenced documents.

## Financial invariants

- Application conversion creates one loan and its complete monthly schedule atomically.
- Installment IDs are deterministic: `month_001`, `month_002`, and so on.
- Each installment is settled once in full; no nested `payments` collection exists.
- Repayment IDs are deterministic: `repayment_{loanId}_{installmentId}`.
- Repayment creation, installment settlement, and loan balance update are atomic.
- Transactions are immutable; corrections use reversal or adjustment entries.

## Mock data

Validate locally without Firebase access:

```bash
npm run check:schema-v2
```

Upsert the deterministic dataset into the configured Firebase project:

```bash
npm run seed
```

The seed never deletes data. Clear old collections manually before the first schema-v2 seed. It validates references, bcrypt hashes, installment totals, paid-transaction links, and remaining balances before writing.
