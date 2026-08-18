'use strict';

const { defineCollection } = require('./collection');

module.exports = defineCollection({
  fixtureKey: 'userLocations',
  path: 'userLocations',
  idField: 'userId',
});
