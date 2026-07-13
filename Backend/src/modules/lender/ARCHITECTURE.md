# Lender module architecture

The lender backend uses feature-local application services. Controllers handle HTTP concerns only; services coordinate use cases; data services own Firestore queries and document mapping; pure factories build derived output.

## Dependency direction

```text
controller -> application service -> data service -> FirebaseService
                              \----> pure factory
```

- A feature must not inject another feature's full application service.
- Cross-feature writes use a narrow port such as `LenderNotificationWriterService`.
- Firestore documents are mapped at the data-service boundary.
- Financial writes stay in transaction-focused services.
- API response types stay separate from internal persistence models.
- Tests target public service boundaries rather than private implementation methods.

## Current responsibility split

- Analytics: data loading, summary/overview calculation, and drill-down presentation.
- Dashboard: borrower portfolio queries and summary metrics.
- Notifications: inbox queries, source synchronization, draft creation, and narrow writes.
- Payments: list orchestration, data loading, ledger details, and installment writes.

Run `npm run architecture:lender` when adding or reorganizing lender features. It rejects oversized services and unapproved cross-feature service dependencies.
