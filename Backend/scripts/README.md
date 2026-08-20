# Backend scripts

These scripts are grouped by responsibility. Run commands from `Backend/`.

## Seed data

`seed/` owns fixture generation and Firestore writes:

- `config.js` reads environment settings and selects a seed profile.
- `profiles.js` defines the intended dataset shapes.
- `fixtures.js` creates the canonical records and stable development accounts.
- `bulk-fixtures.js` adds generated records and cross-collection history.
- `collections/` contains one writer per Firestore collection.
- `validate.js` checks IDs, relationships, balances, and document counts.
- `shared/` contains Firebase initialization and retrying batch writes.

The default `history` profile creates a few generated users with deep history:

```bash
npm run seed:bulk:check
npm run seed:bulk
```

The `volume` profile is reserved for pagination and performance testing:

```bash
SEED_PROFILE=volume npm run seed:bulk:check
SEED_PROFILE=volume SEED_ENABLED=true npm run seed:bulk
```

All write commands require `SEED_ENABLED=true`. Always run the matching
`:check` command first. Seed writes are merge upserts with deterministic IDs;
they do not delete records.

There is one seed engine. `basic`, `history`, and `volume` are profiles, not
separate implementations. `basic` is useful for a quick local smoke dataset;
`history` is the default realistic account-history dataset; and `volume` is
for pagination and performance testing.

## Operations and maintenance

- `operations/firestore/` checks or creates required Firestore indexes.
- `operations/migrations/` migrates legacy loan agreements; it is dry-run
  by default and requires `MIGRATION_ENABLED=true` to apply changes.
- `quality/` contains architecture checks and other repository quality gates.
- `docs/` contains the Firestore schema and loan agreement documentation.

Keep operational scripts separate from seed generation. A script that changes
existing production data should have a dry-run or explicit enable flag before
it can write.
