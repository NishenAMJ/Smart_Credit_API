# Loan Agreement Workflow

Loan contracts use `loanAgreements`; `legalDocuments` is reserved for platform
terms, privacy policies, and lender/borrower platform agreements.

## Cloudinary owner setup

Add real values only to `Backend/.env`:

```env
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
LEGAL_AUDIT_HASH_SALT=...
```

Generate the audit salt with `openssl rand -hex 32`. Never commit these values.
In Cloudinary Console → Settings → Security, enable delivery of PDF and ZIP
files. Uploads are performed by Nest, so no unsigned upload preset or browser
CORS setup is required. Restart Nest after changing the environment.

## Lifecycle

1. A lender approval creates one `pending_disbursement` loan and version-one
   agreement in one Firestore transaction.
2. The lender signs the exact agreement version and terms hash first, moving the
   agreement to `awaiting_disbursement`.
3. The lender explicitly records that the external transfer was sent, with an
   optional bank reference. Smart Credit stores this attestation but does not
   execute or independently verify the transfer. The agreement then moves to
   `awaiting_borrower_signature`.
4. The borrower confirms receipt of funds and signs using their verified profile
   name. This second signature generates
   an authenticated Cloudinary PDF, writes its
   deterministic `documents` record, creates the disbursement ledger entry and
   monthly installments, and activates the loan.
5. If PDF finalization fails, signatures and transfer confirmation remain valid and either participant
   can retry. Deterministic IDs prevent duplicate ledger or installment data.

PDFs are downloaded through the authenticated backend endpoint. Clients must
send the JWT in the `Authorization` header; tokens and Cloudinary URLs must
never be placed in query strings.

## Legacy migration

Review the dry-run first:

```bash
npm run migrate:loan-agreements
```

To apply after reviewing the output:

```bash
MIGRATION_ENABLED=true npm run migrate:loan-agreements:apply
```

The migration preserves all source `legalDocuments`. Fully signed contracts
become read-only migrated records; incomplete contracts are superseded and
receive a fresh unsigned version. Migration never activates or disburses an
existing loan.

## Development seeds

The seed editions include deterministic unsigned, lender-signed,
transfer-confirmed, finalization-failed, and fully accepted records without fake
Cloudinary URLs:

```bash
npm run seed:basic:check
npm run seed:bulk:check
```

Deploy the synchronized Firestore indexes before using a new Firebase project.
