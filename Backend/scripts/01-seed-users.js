'use strict';

const bcrypt = require('bcrypt');

const { getDb } = require('./shared/firebase');
const { commitSetWrites } = require('./shared/firestore-helpers');
const {
  buildMockFixtures,
  normalizeEmail,
  normalizePhone,
  photoURL,
} = require('./shared/mock-fixtures');

async function seedUsers() {
  const db = getDb();
  const fixtures = buildMockFixtures();

  const writes = [];

  for (const user of fixtures.users) {
    const passwordHash = await bcrypt.hash(user.password, 10);

    writes.push({
      ref: db.collection('users').doc(user.uid),
      data: {
        uid: user.uid,
        role: [user.role],
        fullName: user.fullName,
        photoURL: photoURL(user.uid),
        phone: user.phone,
        email: user.email,
        emailLower: normalizeEmail(user.email),
        phoneNormalized: normalizePhone(user.phone),
        passwordHash,
        creditScore: user.creditScore,
        rating: user.rating,
        totalLoansCompleted: user.totalLoansCompleted,
        totalAmountLent: user.totalAmountLent,
        totalAmountBorrowed: user.totalAmountBorrowed,
        kycStatus: user.kycStatus,
        profileComplete: user.profileComplete,
        accountStatus: 'active',
        authProvider: 'local',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  }

  await commitSetWrites(db, writes, 'users');

  console.log('01 complete: users created for lenders, borrowers, and admin.');
  console.log('Login accounts:');
  fixtures.users.forEach((user) => {
    console.log(`- ${user.role}: ${user.email} / ${user.password}`);
  });
}

if (require.main === module) {
  seedUsers().catch((error) => {
    console.error('01-seed-users failed.');
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = seedUsers;
