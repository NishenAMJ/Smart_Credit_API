'use strict';

const { defineCollection } = require('./collection');

module.exports = defineCollection({
  fixtureKey: 'documents',
  path: 'documents',
  idField: 'documentId',
});
