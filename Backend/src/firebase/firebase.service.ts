import { Injectable, Inject } from '@nestjs/common';
import { app } from 'firebase-admin';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
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

  /** Returns a Firestore collection reference */
  collection(name: string) {
    return this.db.collection(name);
  }

  /** Returns the current server timestamp */
  serverTimestamp(): FieldValue {
    return FieldValue.serverTimestamp();
  }

  /**
   * Saves a generic document in the requested Firestore collection.
   */
  async saveData(collection: string, data: Record<string, unknown>) {
    return this.db.collection(collection).add(data);
  }

  getDb(): Firestore {
    return this.db;
  }
}
