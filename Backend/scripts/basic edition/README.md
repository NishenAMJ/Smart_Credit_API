# Basic Edition Database Seed

This edition creates a small but complete dataset for normal development. It
uses the same canonical attributes, validation, batching, and relationships as
the bulk edition.

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
