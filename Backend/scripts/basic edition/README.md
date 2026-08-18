# Basic Edition Database Seed

This edition creates a small but complete dataset for normal development. It
uses the same canonical attributes, validation, batching, and relationships as
the bulk edition.

Both editions also share the one-file-per-collection registry in
[`../bulk edition/collections`](../bulk%20edition/collections). The basic runner
only applies smaller settings before invoking the shared main seed script, so a
new collection should be registered once rather than copied between editions.

The generated login reference for this edition is documented in
[`LOGIN_DETAILS.md`](./LOGIN_DETAILS.md).

## Default generated data

| Record type  | Additional records |
| ------------ | -----------------: |
| Lenders      |                  5 |
| Borrowers    |                 10 |
| Listings     |                  8 |
| Applications |                 15 |
| Loans        |                  8 |

Related credentials, KYC documents, installments, transactions,
notifications, conversations, disputes, locations, legal acceptances, and
audit logs are generated automatically.

## Commands

Run from `Backend/`:

```bash
npm run seed:basic:check
npm run seed:basic
```

Before using a newly created Firebase project, check and deploy the canonical
Firestore indexes with the same service-account configuration used by the seed:

```bash
npm run firestore:indexes:check
npm run firestore:indexes:deploy
```

The deployable index definition is mirrored at
[`../firestore.indexes.json`](../firestore.indexes.json) for script users. Index
deployment is intentionally separate from data seeding because index creation is
asynchronous and requires Firestore index-management permission. Wait until
Firebase reports that the indexes are ready before loading dashboards or the AI
assistant.

The service account needs the `Cloud Datastore Index Admin`
(`roles/datastore.indexAdmin`) role for deployment. If your project uses a
Firebase CLI user instead, run `npx firebase-tools login` and then deploy from
the repository root with:

```bash
npx firebase-tools deploy --only firestore:indexes --project YOUR_FIREBASE_PROJECT_ID
```

The write command requires `SEED_ENABLED=true` in `Backend/.env`.

## No conflicts with bulk edition

Basic records use the `basic_dev` batch ID and bulk records use `bulk_dev`.
Therefore generated IDs, emails, phones, application IDs, loan IDs, and related
records are different. Both editions can be run in either order. The four
stable development login accounts are intentionally safe merge-upserts, not
duplicates.

Optional basic-only overrides are `BASIC_SEED_RANDOM_SEED`,
`BASIC_SEED_BATCH_ID`, `BASIC_SEED_LENDER_COUNT`,
`BASIC_SEED_BORROWER_COUNT`, `BASIC_SEED_LISTING_COUNT`,
`BASIC_SEED_APPLICATION_COUNT`, `BASIC_SEED_LOAN_COUNT`, and
`BASIC_SEED_DEFAULT_PASSWORD`.

See [`../schemas.md`](../schemas.md) for the complete collection and attribute
inventory shared by both editions and used by the runtime backend.
Cloudinary setup, signing lifecycle, and safe legacy migration are documented
in [`../LOAN_AGREEMENTS.md`](../LOAN_AGREEMENTS.md).
