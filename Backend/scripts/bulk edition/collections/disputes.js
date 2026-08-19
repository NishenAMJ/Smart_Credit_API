'use strict';

const { defineCollection } = require('./collection');

module.exports = defineCollection({
  fixtureKey: 'disputes',
  path: 'disputes',
  idField: 'disputeId',
});
