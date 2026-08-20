'use strict';

const { defineCollection } = require('../collection');

module.exports = defineCollection({
  fixtureKey: 'conversations',
  path: 'conversations',
  idField: 'conversationId',
});
