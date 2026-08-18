'use strict';

const { defineCollection } = require('./collection');

module.exports = defineCollection({
  fixtureKey: 'legalAcceptances',
  path: 'legalAcceptances',
  idField: 'acceptanceId',
});
