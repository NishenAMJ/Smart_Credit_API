'use strict';

const { defineCollection } = require('../collection');

module.exports = defineCollection({
  fixtureKey: 'users',
  path: 'users',
  idField: 'userId',
});
