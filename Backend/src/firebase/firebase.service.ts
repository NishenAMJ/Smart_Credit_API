import { Injectable, Inject } from '@nestjs/common';
import { app } from 'firebase-admin';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

@Injectable()
export class FirebaseService {
  public db: Firestore;

  constructor(@Inject('FIREBASE_APP') private firebaseApp: app.App) {
    this.db = getFirestore(this.firebaseApp);
  }

  // Example: Saving a loan application
  async saveData(collection: string, data: any) {
    return await this.db.collection(collection).add(data);
  }
}
