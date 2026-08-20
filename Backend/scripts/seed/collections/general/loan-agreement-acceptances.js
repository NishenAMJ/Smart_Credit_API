'use strict';

const { defineCollection } = require('../collection');

module.exports = defineCollection({
  fixtureKey: 'loanAgreementAcceptances',
  path: 'loanAgreementAcceptances',
  idField: 'acceptanceId',
});
