'use strict';

const { commitSetWrites } = require('../../shared/firestore-helpers');

function defineCollection({
  fixtureKey,
  path,
  idField,
  parentFixtureKey,
  parentIdField,
}) {
  if (!fixtureKey || !path || !idField) {
    throw new Error(
      'A seed collection requires fixtureKey, path, and idField.',
    );
  }

  const pathParts = path.split('/');
  const nested = pathParts.length === 2;
  if (nested !== Boolean(parentFixtureKey && parentIdField)) {
    throw new Error(
      `Collection ${path} must define both parentFixtureKey and parentIdField when it is nested.`,
    );
  }

  function documentRef(db, record) {
    if (!nested) {
      return db.collection(pathParts[0]).doc(record[idField]);
    }

    return db
      .collection(pathParts[0])
      .doc(record[parentIdField])
      .collection(pathParts[1])
      .doc(record[idField]);
  }

  return Object.freeze({
    fixtureKey,
    path,
    idField,
    parentFixtureKey: parentFixtureKey ?? null,
    parentIdField: parentIdField ?? null,

    records(fixtures) {
      const records = fixtures[fixtureKey];
      if (!Array.isArray(records)) {
        throw new Error(
          `Fixtures for ${path} must be an array at fixtures.${fixtureKey}.`,
        );
      }
      return records;
    },

    async write({ db, fixtures, writeOptions }) {
      const writes = this.records(fixtures).map((data) => ({
        ref: documentRef(db, data),
        data,
      }));
      await commitSetWrites(db, writes, path, writeOptions);
    },
  });
}

module.exports = { defineCollection };
