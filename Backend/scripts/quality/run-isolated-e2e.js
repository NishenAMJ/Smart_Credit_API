'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const backendRoot = path.resolve(__dirname, '..', '..');
const javaCandidates = [
  '/opt/homebrew/opt/openjdk@21/bin',
  '/usr/local/opt/openjdk@21/bin',
];
const javaBin = javaCandidates.find((candidate) =>
  fs.existsSync(path.join(candidate, 'java')),
);
const executable = path.join(
  backendRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'firebase.cmd' : 'firebase',
);
const env = {
  ...process.env,
  ...(javaBin
    ? { PATH: `${javaBin}${path.delimiter}${process.env.PATH || ''}` }
    : {}),
  FIREBASE_CLI_DISABLE_UPDATE_CHECK: 'true',
};
const command = [
  'npm',
  'run',
  'test:e2e',
].join(' ');
const result = spawnSync(
  executable,
  [
    '--config',
    '../firebase.json',
    'emulators:exec',
    '--project',
    'smart-credit-test',
    '--only',
    'auth,firestore,storage',
    command,
  ],
  {
    cwd: backendRoot,
    env: {
      ...env,
      NODE_ENV: 'test',
      JWT_SECRET: 'smart-credit-isolated-e2e-secret',
      FIREBASE_PROJECT_ID: 'smart-credit-test',
    },
    stdio: 'inherit',
  },
);

if (result.error) throw result.error;
process.exitCode = result.status || 0;
