import { Injectable, Inject } from '@nestjs/common';
import { app } from 'firebase-admin';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

@Injectable()
export class FirebaseService {
  public db: Firestore;

  constructor(@Inject('FIREBASE_APP') private firebaseApp: app.App) {
    this.db = getFirestore(this.firebaseApp);
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
