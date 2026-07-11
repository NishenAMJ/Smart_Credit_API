'use strict';

const fs = require('fs');
const path = require('path');

const { geohashForLocation } = require('geofire-common');

const { admin, getDb } = require('./shared/firebase');
const {
  assertTopLevelDocsExist,
  commitSetWrites,
} = require('./shared/firestore-helpers');

const DEFAULT_DATA_FILE = path.resolve(
  __dirname,
  'data',
  'lender-locations.json',
);

function readDataFile() {
  const dataFileArg = process.argv.find((arg) => arg.startsWith('--file='));
  const dataFile = dataFileArg
    ? path.resolve(process.cwd(), dataFileArg.slice('--file='.length))
    : DEFAULT_DATA_FILE;

  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function readCoordinate(value, label, min, max, userId) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric < min || numeric > max) {
    throw new Error(
      `${label} for ${userId} must be a number between ${min} and ${max}.`,
    );
  }

  return numeric;
}

function cleanText(value) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function removeUndefined(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  );
}

async function seedLenderLocations() {
  const db = getDb();
  const locations = readDataFile();

  if (!Array.isArray(locations) || locations.length === 0) {
    throw new Error('lender locations JSON must contain at least one item.');
  }

  const userIds = locations.map((location) => String(location.userId ?? ''));
  await assertTopLevelDocsExist(db, 'users', userIds, 'lender location seed');

  const writes = locations.map((location) => {
    const userId = String(location.userId ?? '').trim();
    const latitude = readCoordinate(
      location.latitude,
      'latitude',
      -90,
      90,
      userId,
    );
    const longitude = readCoordinate(
      location.longitude,
      'longitude',
      -180,
      180,
      userId,
    );

    return {
      ref: db.collection('userLocations').doc(userId),
      data: removeUndefined({
        userId,
        role: 'lender',
        latitude,
        longitude,
        geohash: geohashForLocation([latitude, longitude]),
        city: cleanText(location.city),
        district: cleanText(location.district),
        visibility: 'exact',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
    };
  });

  await commitSetWrites(db, writes, 'lender locations');

  console.log(
    `13 complete: ${writes.length} lender locations written to userLocations.`,
  );
}

if (require.main === module) {
  seedLenderLocations().catch((error) => {
    console.error('13-seed-lender-locations failed.');
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = seedLenderLocations;
