'use strict';

const { defineCollection } = require('./collection');

module.exports = defineCollection({
  fixtureKey: 'loanApplications',
  path: 'loanApplications',
  idField: 'applicationId',
});
