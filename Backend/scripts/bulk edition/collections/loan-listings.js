'use strict';

const { defineCollection } = require('./collection');

module.exports = defineCollection({
  fixtureKey: 'loanListings',
  path: 'loanListings',
  idField: 'listingId',
});
