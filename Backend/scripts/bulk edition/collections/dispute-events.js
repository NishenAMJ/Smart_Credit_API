'use strict';

const { defineCollection } = require('./collection');

module.exports = defineCollection({
  fixtureKey: 'disputeEvents',
  path: 'disputes/events',
  idField: 'eventId',
  parentFixtureKey: 'disputes',
  parentIdField: 'disputeId',
});
