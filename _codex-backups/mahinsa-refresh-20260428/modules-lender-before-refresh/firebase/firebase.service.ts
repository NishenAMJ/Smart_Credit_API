import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { Firestore, getFirestore } from 'firebase-admin/firestore';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private db!: Firestore;

  onModuleInit() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });
    }
    this.db = getFirestore();
    console.log('✅ Firebase connected successfully!');
  }

  getDb(): Firestore {
    return this.db;
  }
}
