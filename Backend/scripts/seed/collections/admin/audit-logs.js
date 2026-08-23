'use strict';

const { defineCollection } = require('../collection');

module.exports = defineCollection({
  fixtureKey: 'auditLogs',
  path: 'auditLogs',
  idField: 'auditLogId',
});
