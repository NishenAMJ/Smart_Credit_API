'use strict';

const { defineCollection } = require('../collection');

module.exports = defineCollection({
  fixtureKey: 'notifications',
  path: 'notifications',
  idField: 'notificationId',
});
