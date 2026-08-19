'use strict';

const { defineCollection } = require('./collection');

module.exports = defineCollection({
  fixtureKey: 'loans',
  path: 'loans',
  idField: 'loanId',
});
