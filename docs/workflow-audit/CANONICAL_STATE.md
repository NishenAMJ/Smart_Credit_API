# Canonical state and data ownership

| Domain | Canonical owner | Derived/read models | Rules |
| --- | --- | --- | --- |
| Account | `users.accountStatus` and `users.roles` | JWT payload, dashboards | Every guarded request reloads the user. Suspended/deleted users and removed roles invalidate an existing token. |
| KYC | `users.kycStatus` | `borrowers.kycVerified`, KYC documents, mobile submission, admin grouping/counters | Admin approval/rejection updates the complete user submission atomically. A document is never treated as the account-level decision. |
| Listing | `loanListings.status` | marketplace, lender history, analytics | Only active, admin-approved listings may accept applications. |
| Application | `loanApplications.status` | borrower history, lender request queue | Client actions use the stored Firestore `applicationId`; retryable submission and conversion are idempotent. |
| Loan | `loans.status`, `remainingBalanceMinor`, `amountPaidMinor` | dashboards, histories, reports | Lifecycle transitions and balances are server-owned and written in transactions. |
| Installment | `loans/{loanId}/installments/{id}.status` | schedules, overdue lists | Settlement writes installment, loan balance, and deterministic ledger transaction atomically. |
| Agreement | `loanAgreements.status` | loan agreement summary/history | Lender acceptance and transfer confirmation precede borrower acceptance and activation. |
| Payment | deterministic `transactions.transactionId` | receipts, histories, reports | Money is integer minor units in LKR. Idempotency keys prevent callback, QR, and duplicate-tap replay. |
| Dispute | `disputes.status` plus ordered `events` subcollection | participant/admin timelines and counts | Shared events exclude private admin notes; transitions enforce actor, ownership, reopen window, and acknowledgement rules. |
| Notification | borrower: `borrowerNotifications`; lender/admin: `notifications` | unread counts, realtime UI | Deterministic event IDs are used for retryable domain transitions; `isRead` and `readAt` change together. |
| Chat | `conversations` and `messages` | unread/read state and local cache | Only participants can read/write. The removed legacy borrower-chat API is not a supported contract. |

Repayment schedules are intentionally created when a fully signed agreement is
activated/disbursed, rather than at application approval. Before that point,
the loan is `pending_disbursement` and no payment is contractually due.
