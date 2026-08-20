# Seed collection modules

Every Firestore collection written by the seeder has one module in this
folder. Each module states three things clearly:

- the matching key in the generated fixtures;
- the Firestore collection path;
- the field used as the document ID.

`index.js` is the ordered registry. The outside `../run.js` entry point builds
and validates all fixture data, then runs every registered collection module.
Every seed profile uses this same registry and writer layer.

## Collection groups

The folders describe the main database area a collection supports:

- `borrowers/`: identity documents and borrower KYC submissions.
- `lenders/`: lender listings and the lender-side application flow.
- `admin/`: audit logs and platform legal/compliance records.
- `general/`: shared users, authentication, loans, repayments, disputes,
  agreements, notifications, messaging, and locations.

Some records are shared by multiple roles, so `general/` contains the
cross-role collections rather than duplicating a writer in each role folder.

`index.js` remains the single ordered registry. Folder placement does not
change Firestore paths or write dependencies.

## Add a collection

1. Add its records to the fixture object in `../fixtures.js` (or to the bulk
   generator in `../bulk-fixtures.js`).
2. Create one module here using `defineCollection`.
3. Add that module to `index.js` after the collections it depends on.
4. Add relationship rules in `../validate.js` only when the new collection
   references other records. Its document count is included automatically.

For a top-level collection:

```js
module.exports = defineCollection({
  fixtureKey: 'exampleRecords',
  path: 'exampleRecords',
  idField: 'exampleId',
});
```

For a subcollection such as `parents/{parentId}/children/{childId}`, also set
`parentFixtureKey` and `parentIdField`, and use `parents/children` as the path.
