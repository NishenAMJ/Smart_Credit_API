'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const backendRoot = path.resolve(__dirname, '..', '..');
const projectRoot = path.resolve(backendRoot, '..');
const tasks = [
  [
    'Backend unit tests',
    backendRoot,
    ['test', '--', '--runInBand', '--silent'],
  ],
  ['Backend build', backendRoot, ['run', 'build']],
  ['Lender architecture', backendRoot, ['run', 'architecture:lender']],
  ['API contracts', backendRoot, ['run', 'contracts:check']],
  ['Firestore indexes', backendRoot, ['run', 'firestore:indexes:validate']],
  [
    'KYC backfill safety',
    backendRoot,
    ['run', 'migrate:kyc-consistency:validate'],
  ],
  ['Basic seed validation', backendRoot, ['run', 'seed:basic:check']],
  ['History seed validation', backendRoot, ['run', 'seed:bulk:check']],
  ['Volume seed validation', backendRoot, ['run', 'seed:volume:check']],
  [
    'Admin/lender web build',
    path.join(projectRoot, 'Frontend', 'web'),
    ['run', 'build'],
  ],
  [
    'Mobile type-check',
    path.join(projectRoot, 'Frontend', 'mobile-app'),
    ['exec', 'tsc', '--', '--noEmit'],
  ],
];

if (!process.argv.includes('--skip-integration')) {
  tasks.push(
    ['Isolated API E2E', backendRoot, ['run', 'test:e2e:isolated']],
    [
      'Admin/lender web E2E',
      path.join(projectRoot, 'Frontend', 'web'),
      ['run', 'test:e2e'],
    ],
  );
}

for (const [label, cwd, args] of tasks) {
  console.log(`\n==> ${label}`);
  const result = spawnSync('npm', args, {
    cwd,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      SEED_LOGIN_DETAILS_MODE: 'none',
    },
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`\nWorkflow gate stopped at: ${label}`);
    process.exit(result.status || 1);
  }
}

console.log('\nAll Smart Credit workflow quality gates passed.');
