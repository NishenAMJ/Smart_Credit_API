'use strict';

const { defineCollection } = require('../collection');

module.exports = defineCollection({
  fixtureKey: 'loanAgreements',
  path: 'loanAgreements',
  idField: 'agreementId',
});
