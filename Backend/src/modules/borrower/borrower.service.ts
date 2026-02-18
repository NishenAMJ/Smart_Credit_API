import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class BorrowerService {
  private db: FirebaseFirestore.Firestore;

  constructor() {
    this.db = admin.firestore();
  }

  async getFeaturedLoans() {
    try {
      const snapshot = await this.db
        .collection('loans')
        .where('status', '==', 'active')
        .where('isFeatured', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

      const loans = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        statusCode: 200,
        message: 'Featured loans fetched successfully',
        total: loans.length,
        data: loans,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch featured loans');
    }
  }
}
