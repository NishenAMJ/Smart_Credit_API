'use strict';

const { defineCollection } = require('../collection');

module.exports = defineCollection({
  fixtureKey: 'transactions',
  path: 'transactions',
  idField: 'transactionId',
});
