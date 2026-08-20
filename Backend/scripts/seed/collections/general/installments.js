'use strict';

const { defineCollection } = require('../collection');

module.exports = defineCollection({
  fixtureKey: 'installments',
  path: 'loans/installments',
  idField: 'installmentId',
  parentFixtureKey: 'loans',
  parentIdField: 'loanId',
});
