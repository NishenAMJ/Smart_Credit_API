const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const serviceAccount = require('./firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function seedUsers() {
  console.log('🌱 Starting to seed users...\n');

  const users = [
    {
      email: 'john.borrower@example.com',
      password: 'password123',
      role: 'borrower',
      status: 'active',
      firstName: 'John',
      lastName: 'Doe',
    },
    {
      email: 'jane.borrower@example.com',
      password: 'password123',
      role: 'borrower',
      status: 'active',
      firstName: 'Jane',
      lastName: 'Smith',
    },
    {
      email: 'bob.lender@example.com',
      password: 'password123',
      role: 'lender',
      status: 'active',
      firstName: 'Bob',
      lastName: 'Johnson',
    },
    {
      email: 'alice.lender@example.com',
      password: 'password123',
      role: 'lender',
      status: 'active',
      firstName: 'Alice',
      lastName: 'Williams',
    },
    {
      email: 'mike.borrower@example.com',
      password: 'password123',
      role: 'borrower',
      status: 'suspended',
      firstName: 'Mike',
      lastName: 'Brown',
      suspensionReason: 'Failed to repay loan',
    },
    {
      email: 'sarah.admin@example.com',
      password: 'admin123',
      role: 'admin',
      status: 'active',
      firstName: 'Sarah',
      lastName: 'Admin',
    },
  ];

  try {
    for (const userData of users) {
      const existingUser = await db
        .collection('users')
        .where('email', '==', userData.email)
        .get();

      if (!existingUser.empty) {
        console.log(`⏭️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      const passwordHash = await bcrypt.hash(userData.password, 10);

      const userDoc = {
        email: userData.email,
        passwordHash,
        role: userData.role,
        status: userData.status,
        firstName: userData.firstName,
        lastName: userData.lastName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (userData.status === 'suspended') {
        Object.assign(userDoc, {
          suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
          suspensionReason: userData.suspensionReason || 'No reason provided',
        });
      }

      const docRef = await db.collection('users').add(userDoc);
      console.log(`✅ Created user: ${userData.email} (${userData.role}) - ID: ${docRef.id}`);
    }

    console.log('\n🎉 Seeding completed successfully!');
    console.log('\nTest credentials:');
    console.log('- Admin: sarah.admin@example.com / admin123');
    console.log('- Borrower: john.borrower@example.com / password123');
    console.log('- Lender: bob.lender@example.com / password123');
    
  } catch (error) {
    console.error('❌ Error seeding users:', error);
  } finally {
    process.exit(0);
  }
}

seedUsers();