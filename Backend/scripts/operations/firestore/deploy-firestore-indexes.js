'use strict';

const fs = require('fs');
const path = require('path');

const { initializeFirebase } = require('../../shared/firebase');

// Keep one tracked source of truth so fresh clones deploy the same indexes as
// Firebase CLI. The old colocated manifest was gitignored and could silently
// be missing for other developers.
const manifestPath = path.resolve(
  __dirname,
  '../../../../firestore.indexes.json',
);
const checkOnly = process.argv.includes('--check');

function normalizeFields(fields) {
  const normalized = fields.map((field) => ({
    fieldPath: field.fieldPath,
    ...(field.order ? { order: field.order } : {}),
    ...(field.arrayConfig ? { arrayConfig: field.arrayConfig } : {}),
  }));

  if (!normalized.some((field) => field.fieldPath === '__name__')) {
    const lastOrdered = [...normalized].reverse().find((field) => field.order);
    normalized.push({
      fieldPath: '__name__',
      order: lastOrdered?.order ?? 'ASCENDING',
    });
  }

  return normalized;
}

function signature(queryScope, fields) {
  return JSON.stringify({
    queryScope,
    fields: normalizeFields(fields),
  });
}

async function request(url, accessToken, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Firestore Admin API returned ${response.status}: ${message}`,
    );
  }

  return response.json();
}

async function listIndexes(baseUrl, collectionGroup, accessToken) {
  const indexes = [];
  let pageToken = '';

  do {
    const url = new URL(
      `${baseUrl}/${encodeURIComponent(collectionGroup)}/indexes`,
    );
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const result = await request(url, accessToken);
    indexes.push(...(result.indexes ?? []));
    pageToken = result.nextPageToken ?? '';
  } while (pageToken);

  return indexes;
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const app = initializeFirebase();
  const token = await app.options.credential.getAccessToken();
  const projectId = app.options.projectId || process.env.FIREBASE_PROJECT_ID;

  if (!projectId) throw new Error('Firebase project ID is not configured.');

  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups`;
  const groups = [
    ...new Set(manifest.indexes.map((index) => index.collectionGroup)),
  ];
  const existingByGroup = new Map();

  for (const group of groups) {
    const existing = await listIndexes(baseUrl, group, token.access_token);
    existingByGroup.set(
      group,
      new Set(
        existing.map((index) =>
          signature(index.queryScope, index.fields ?? []),
        ),
      ),
    );
  }

  const missing = manifest.indexes.filter((index) => {
    const existing = existingByGroup.get(index.collectionGroup) ?? new Set();
    return !existing.has(signature(index.queryScope, index.fields));
  });

  console.log(
    `Firestore project ${projectId}: ${manifest.indexes.length - missing.length}/${manifest.indexes.length} indexes already exist.`,
  );

  if (missing.length === 0) return;

  if (checkOnly) {
    console.error(
      `${missing.length} indexes are missing. Run npm run firestore:indexes:deploy.`,
    );
    process.exitCode = 2;
    return;
  }

  for (const index of missing) {
    const fields = normalizeFields(index.fields);
    await request(
      `${baseUrl}/${encodeURIComponent(index.collectionGroup)}/indexes`,
      token.access_token,
      {
        method: 'POST',
        body: JSON.stringify({ queryScope: index.queryScope, fields }),
      },
    );
    console.log(
      `Creating ${index.collectionGroup}: ${fields.map((field) => field.fieldPath).join(', ')}`,
    );
  }

  console.log(
    'Index creation started. Wait until Firebase reports every index as READY.',
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
