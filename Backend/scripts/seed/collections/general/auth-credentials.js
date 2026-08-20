'use strict';

const { defineCollection } = require('../collection');

module.exports = defineCollection({
  fixtureKey: 'authCredentials',
  path: 'authCredentials',
  idField: 'userId',
});
