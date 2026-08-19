'use strict';

const { defineCollection } = require('./collection');

module.exports = defineCollection({
  fixtureKey: 'messages',
  path: 'conversations/messages',
  idField: 'messageId',
  parentFixtureKey: 'conversations',
  parentIdField: 'conversationId',
});
