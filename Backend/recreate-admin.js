const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function recreateAdmin() {
  try {
    // Delete existing admin user
    const existingSnapshot = await db.collection('users').where('emailLower', '==', 'admin@smartcredit.lk').get();
    if (!existingSnapshot.empty) {
      await existingSnapshot.docs[0].ref.delete();
      console.log('Deleted existing admin user');
    }

    // Create new admin user
    const passwordHash = await bcrypt.hash('Admin@123', 10);
    const now = admin.firestore.Timestamp.now();

    const adminUser = {
      uid: 'admin-user-001',
      role: ['admin'],
      fullName: 'System Administrator',
      photoURL: '',
      phone: '+94712345678',
      email: 'admin@smartcredit.lk',
      emailLower: 'admin@smartcredit.lk',
      phoneNormalized: '+94712345678',
      passwordHash,
      creditScore: 0,
      rating: 0,
      totalLoansCompleted: 0,
      totalAmountLent: 0,
      totalAmountBorrowed: 0,
      kycStatus: 'approved',
      accountStatus: 'active',
      authProvider: 'local',
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('users').doc('admin-user-001').set(adminUser);

    console.log('✅ Admin user recreated successfully!');
    console.log('Email: admin@smartcredit.lk');
    console.log('Password: Admin@123');
    console.log('Role: admin');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

recreateAdmin();