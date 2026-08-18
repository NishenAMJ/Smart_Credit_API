'use strict';

const { defineCollection } = require('./collection');

module.exports = defineCollection({
  fixtureKey: 'legalDocuments',
  path: 'legalDocuments',
  idField: 'legalDocumentId',
});
