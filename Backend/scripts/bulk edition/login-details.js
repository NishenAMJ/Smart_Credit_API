'use strict';

const fs = require('fs');
const path = require('path');

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeLoginDetails(fixtures, config) {
  const outputPath = path.resolve(
    __dirname,
    `login-details-${config.batchId}.csv`,
  );
  const header = [
    'roles',
    'userId',
    'email',
    'phone',
    'password',
    'accountStatus',
    'kycStatus',
  ];
  const rows = fixtures.users.map((user) => [
    user.roles.join('|'),
    user.userId,
    user.email,
    user.phone,
    config.defaultPassword,
    user.accountStatus,
    user.kycStatus,
  ]);
  const contents = [header, ...rows]
    .map((row) => row.map(csvCell).join(','))
    .join('\n');

  fs.writeFileSync(outputPath, `${contents}\n`, { mode: 0o600 });
  fs.chmodSync(outputPath, 0o600);
  console.log(
    `Wrote ${rows.length} development login records to ${outputPath}.`,
  );
  return outputPath;
}

module.exports = { writeLoginDetails };
