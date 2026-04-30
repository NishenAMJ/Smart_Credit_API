import { Injectable, Inject } from '@nestjs/common';
import { app } from 'firebase-admin';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import type { Bucket } from '@google-cloud/storage';

@Injectable()
export class FirebaseService {
  public db: Firestore;
  public bucket: Bucket;

  constructor(@Inject('FIREBASE_APP') private firebaseApp: app.App) {
    this.db = getFirestore(this.firebaseApp);
    this.bucket = getStorage(this.firebaseApp).bucket();
  }

  // Example: Saving a loan application
  async saveData(collection: string, data: any) {
    return await this.db.collection(collection).add(data);
  }

  getDb(): Firestore {
    return this.db;
  }
}
