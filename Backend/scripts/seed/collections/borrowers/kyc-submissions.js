'use strict';

const { defineCollection } = require('../collection');

module.exports = defineCollection({
  fixtureKey: 'kycSubmissions',
  path: 'kycSubmissions',
  idField: 'submissionId',
});
