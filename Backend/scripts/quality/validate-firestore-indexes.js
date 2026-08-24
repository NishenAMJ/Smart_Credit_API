'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const manifestPath = path.join(projectRoot, 'firestore.indexes.json');
const rootConfigPath = path.join(projectRoot, 'firebase.json');
const backendConfigPath = path.join(projectRoot, 'Backend', 'firebase.json');
const mirrorManifestPaths = [
  path.join(projectRoot, 'Backend', 'firestore.indexes.json'),
  path.join(projectRoot, 'scripts', 'firestore.indexes.json'),
  path.join(
    projectRoot,
    'Backend',
    'scripts',
    'operations',
    'firestore',
    'firestore.indexes.json',
  ),
];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(
      `Could not parse ${path.relative(projectRoot, filePath)}: ${error.message}`,
    );
  }
}

const manifest = readJson(manifestPath);
const rootConfig = readJson(rootConfigPath);
const backendConfig = readJson(backendConfigPath);
const errors = [];

for (const mirrorPath of mirrorManifestPaths) {
  const mirror = readJson(mirrorPath);
  if (JSON.stringify(mirror) !== JSON.stringify(manifest)) {
    errors.push(
      `${path.relative(projectRoot, mirrorPath)} must match the root Firestore index manifest.`,
    );
  }
}

if (!Array.isArray(manifest.indexes)) {
  errors.push('firestore.indexes.json must contain an indexes array.');
}
if (!Array.isArray(manifest.fieldOverrides)) {
  errors.push('firestore.indexes.json must contain a fieldOverrides array.');
}
if (rootConfig.firestore?.indexes !== 'firestore.indexes.json') {
  errors.push('Root firebase.json must reference firestore.indexes.json.');
}
if (backendConfig.firestore?.indexes !== '../firestore.indexes.json') {
  errors.push(
    'Backend/firebase.json must reference the root firestore.indexes.json.',
  );
}

const signatures = new Set();
for (const [index, definition] of (manifest.indexes || []).entries()) {
  const label = `indexes[${index}]`;
  if (
    typeof definition.collectionGroup !== 'string' ||
    !definition.collectionGroup.trim()
  ) {
    errors.push(`${label} requires a collectionGroup.`);
  }
  if (!['COLLECTION', 'COLLECTION_GROUP'].includes(definition.queryScope)) {
    errors.push(`${label} has an unsupported queryScope.`);
  }
  if (!Array.isArray(definition.fields) || definition.fields.length < 2) {
    errors.push(`${label} must contain at least two fields.`);
    continue;
  }

  for (const [fieldIndex, field] of definition.fields.entries()) {
    const modes = ['order', 'arrayConfig', 'vectorConfig'].filter(
      (key) => field[key] !== undefined,
    );
    if (typeof field.fieldPath !== 'string' || !field.fieldPath.trim()) {
      errors.push(`${label}.fields[${fieldIndex}] requires fieldPath.`);
    }
    if (modes.length !== 1) {
      errors.push(
        `${label}.fields[${fieldIndex}] must declare exactly one index mode.`,
      );
    }
    if (field.order && !['ASCENDING', 'DESCENDING'].includes(field.order)) {
      errors.push(`${label}.fields[${fieldIndex}] has invalid order.`);
    }
  }

  const signature = JSON.stringify(definition);
  if (signatures.has(signature)) {
    errors.push(`${label} duplicates an earlier index definition.`);
  }
  signatures.add(signature);
}

if (errors.length) {
  console.error('Firestore index validation failed:\n');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(
    `Firestore index validation passed (${manifest.indexes.length} composite indexes, ${manifest.fieldOverrides.length} field overrides).`,
  );
}
