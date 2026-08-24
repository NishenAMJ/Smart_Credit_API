# Smart Credit workflow audit

This directory is the release record for end-to-end workflow behavior. A row is
only marked automated when a repeatable test validates the UI or API result and
the relevant Firestore state.

## Safe test environments

Automated integration tests must use the Firebase Emulator Suite with project
ID `smart-credit-test`. `Backend/test/setup-env.ts` aborts if
`FIRESTORE_EMULATOR_HOST` is absent, so the E2E suite cannot accidentally use
shared development data.

Prerequisites:

- Node.js and npm
- Java 21 for the Firebase emulators
- Chromium installed with `npx playwright install chromium`
- Maestro CLI and a configured simulator/device for optional mobile UI smoke
  runs

Run the local deterministic gate (no servers or devices):

```sh
cd Backend
npm run quality:gate:local
```

Run the complete automated gate, including isolated API E2E and Playwright:

```sh
cd Backend
npm run quality:gate
```

Run mobile smoke flows after starting Expo and a test device:

```sh
cd Frontend/mobile-app
npm run test:e2e
```

External providers use `EXTERNAL_PROVIDER_MODE=mock` in automated tests.
Cloudinary returns deterministic metadata, and automated provider-facing paths
must not contact live services. PayHere, TextLK, AI, maps, and push delivery
still require their separately recorded sandbox acceptance before production.

## Dependency security baseline

Run `npm audit --omit=dev --audit-level=high` in each application. At this
revision the web application has zero findings and the backend has no
high/critical production findings (six moderate transitive Google-storage
findings remain). Expo SDK 54 has nine high findings in its Metro/PostCSS build
toolchain; npm's remediation is the breaking Expo 57 upgrade, so it must be
handled as a device-tested compatibility release rather than forced into this
workflow repair.

## Release process

1. Reproduce the defect and add it to `DEFECT_REGISTER.md`.
2. Add a failing regression test at the lowest useful layer.
3. Fix canonical backend behavior, then update clients to use its response.
4. Run `npm run quality:gate` and the relevant Maestro flows.
5. Review dry-run migrations before enabling their explicit apply flag.
6. Fetch and rebase on `origin/dev`, rerun the gate, then push the focused
   commit.
